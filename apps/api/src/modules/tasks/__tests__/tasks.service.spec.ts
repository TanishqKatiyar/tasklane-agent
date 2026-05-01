import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { EventBusService } from '../../../common/event-bus/event-bus.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { TasksService } from '../tasks.service';

// ── Mock Prisma ──────────────────────────────────────────

const mockPrisma = {
  task: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  },
  taskDependency: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
  labelOnTask: {
    createMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  project: {
    findUnique: jest.fn(),
  },
  teamMember: {
    findUnique: jest.fn(),
  },
  notification: {
    create: jest.fn(),
  },
  activity: {
    create: jest.fn(),
  },
  $transaction: jest.fn(),
};

describe('TasksService', () => {
  let service: TasksService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockEventBus = {
      emitTaskEvent: jest.fn(),
      emit: jest.fn(),
    };

    const mockNotifications = {
      create: jest.fn().mockResolvedValue('notif-1'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventBusService, useValue: mockEventBus },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  // ════════════════════════════════════════════════════════
  // TEST 1: Cycle Detection — A→B→A should be rejected
  // ════════════════════════════════════════════════════════

  describe('cycle detection', () => {
    it('should reject A→B→A (direct cycle)', async () => {
      // Setup: Task A is blocked by Task B (A→B exists)
      // Now trying to add: Task B is blocked by Task A (B→A)
      const taskA = 'task-A';
      const taskB = 'task-B';

      // Both tasks exist
      mockPrisma.task.findUnique
        .mockResolvedValueOnce({ id: taskB, title: 'Task B' }) // taskId = B
        .mockResolvedValueOnce({ id: taskA, title: 'Task A' }); // blockingTaskId = A

      // No existing duplicate
      mockPrisma.taskDependency.findUnique.mockResolvedValue(null);

      // detectCycle(blockedTaskId=B, blockingTaskId=A):
      //   DFS starting from A, looking for B
      //   find deps where blockedTaskId=A → [{blockingTaskId: B}]
      //   found B! → cycle detected
      mockPrisma.taskDependency.findMany.mockResolvedValueOnce([{ blockingTaskId: taskB }]);

      await expect(
        service.addDependency(taskB, { blockingTaskId: taskA }, 'user-1'),
      ).rejects.toThrow(/circular dependency/);
    });

    it('should reject A→B→C→A (transitive cycle)', async () => {
      const taskA = 'task-A';
      const taskB = 'task-B';
      const taskC = 'task-C';

      // Trying to add: C blocked by A
      // Existing: A blocked by B, B blocked by C
      // detectCycle(blockedTaskId=C, blockingTaskId=A):
      //   DFS from A, looking for C
      //   A blocked by B (blockedTaskId=A, blockingTaskId=B) → visit B
      //   B blocked by C (blockedTaskId=B, blockingTaskId=C) → visit C → MATCH!

      mockPrisma.task.findUnique
        .mockResolvedValueOnce({ id: taskC, title: 'Task C' })
        .mockResolvedValueOnce({ id: taskA, title: 'Task A' });

      mockPrisma.taskDependency.findUnique.mockResolvedValue(null);

      mockPrisma.taskDependency.findMany
        .mockResolvedValueOnce([{ blockingTaskId: taskB }]) // A blocked by B
        .mockResolvedValueOnce([{ blockingTaskId: taskC }]); // B blocked by C → found target!

      await expect(
        service.addDependency(taskC, { blockingTaskId: taskA }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should ALLOW valid dependency (no cycle)', async () => {
      mockPrisma.task.findUnique
        .mockResolvedValueOnce({ id: 'task-B', title: 'Task B' })
        .mockResolvedValueOnce({ id: 'task-A', title: 'Task A' });

      mockPrisma.taskDependency.findUnique.mockResolvedValue(null);

      // DFS from A: no existing deps
      mockPrisma.taskDependency.findMany.mockResolvedValue([]);

      mockPrisma.taskDependency.create.mockResolvedValue({
        id: 'dep-1',
        blockingTask: { id: 'task-A', number: 1, title: 'Task A', status: 'TODO' },
        blockedTask: { id: 'task-B', number: 2, title: 'Task B', status: 'TODO' },
      });
      mockPrisma.activity.create.mockResolvedValue({});

      const result = await service.addDependency('task-B', { blockingTaskId: 'task-A' }, 'user-1');

      expect(result.id).toBe('dep-1');
    });

    it('should reject self-dependency', async () => {
      await expect(
        service.addDependency('task-A', { blockingTaskId: 'task-A' }, 'user-1'),
      ).rejects.toThrow(/cannot depend on itself/);
    });

    it('should reject duplicate dependency (409)', async () => {
      mockPrisma.task.findUnique
        .mockResolvedValueOnce({ id: 'task-B', title: 'B' })
        .mockResolvedValueOnce({ id: 'task-A', title: 'A' });

      // Already exists
      mockPrisma.taskDependency.findUnique.mockResolvedValue({
        id: 'dep-existing',
      });

      await expect(
        service.addDependency('task-B', { blockingTaskId: 'task-A' }, 'user-1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ════════════════════════════════════════════════════════
  // TEST 2: Position uniqueness on create
  // ════════════════════════════════════════════════════════

  describe('create — position auto-assignment', () => {
    it('two tasks in the same column get different positions', async () => {
      // $transaction executes the callback
      mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(mockPrisma));

      // First create call
      mockPrisma.task.findFirst
        // maxTask for number
        .mockResolvedValueOnce({ number: 5 })
        // maxPos for position in TODO column
        .mockResolvedValueOnce({ position: 2048 });

      mockPrisma.task.create.mockResolvedValueOnce({
        id: 'task-1',
        number: 6,
        title: 'First',
        status: 'TODO',
        position: 3072,
      });
      mockPrisma.activity.create.mockResolvedValue({});

      const first = await service.create(
        'proj-1',
        { title: 'First', color: '#6366f1' } as any,
        'user-1',
      );

      // Reset for second call
      mockPrisma.task.findFirst
        .mockResolvedValueOnce({ number: 6 }) // number
        .mockResolvedValueOnce({ position: 3072 }); // position

      mockPrisma.task.create.mockResolvedValueOnce({
        id: 'task-2',
        number: 7,
        title: 'Second',
        status: 'TODO',
        position: 4096,
      });

      const second = await service.create(
        'proj-1',
        { title: 'Second', color: '#6366f1' } as any,
        'user-1',
      );

      expect(first.position).toBe(3072);
      expect(second.position).toBe(4096);
      expect(first.position).not.toBe(second.position);
    });
  });

  // ════════════════════════════════════════════════════════
  // TEST 3: Multi-filter AND combination
  // ════════════════════════════════════════════════════════

  describe('list — multi-filter AND combination', () => {
    it('should AND-combine status + priority + search filters', async () => {
      mockPrisma.task.count.mockResolvedValue(3);
      mockPrisma.task.findMany.mockResolvedValue([]);

      await service.list('proj-1', {
        page: 1,
        limit: 50,
        status: 'TODO,IN_PROGRESS',
        priority: 'HIGH,URGENT',
        search: 'deploy',
        orderBy: 'position',
        order: 'asc',
      });

      const call = mockPrisma.task.findMany.mock.calls[0]![0];
      const where = call.where;

      // All filters present as AND conditions
      expect(where.projectId).toBe('proj-1');
      expect(where.status).toEqual({ in: ['TODO', 'IN_PROGRESS'] });
      expect(where.priority).toEqual({ in: ['HIGH', 'URGENT'] });
      expect(where.OR).toEqual([
        { title: { contains: 'deploy', mode: 'insensitive' } },
        { description: { contains: 'deploy', mode: 'insensitive' } },
      ]);
    });

    it('should apply date range filters', async () => {
      mockPrisma.task.count.mockResolvedValue(0);
      mockPrisma.task.findMany.mockResolvedValue([]);

      const dueBefore = new Date('2026-12-31');
      const dueAfter = new Date('2026-01-01');

      await service.list('proj-1', {
        page: 1,
        limit: 50,
        dueBefore,
        dueAfter,
        orderBy: 'position',
        order: 'asc',
      });

      const where = mockPrisma.task.findMany.mock.calls[0]![0].where;
      expect(where.dueDate.lte).toEqual(dueBefore);
      expect(where.dueDate.gte).toEqual(dueAfter);
    });
  });

  // ════════════════════════════════════════════════════════
  // TEST 4: Status change tracking
  // ════════════════════════════════════════════════════════

  describe('update — status transitions', () => {
    it('should set completedAt when status moves to DONE', async () => {
      mockPrisma.task.findUnique.mockResolvedValue({
        id: 'task-1',
        status: 'IN_PROGRESS',
        assigneeId: null,
        projectId: 'proj-1',
        title: 'Test task',
      });
      mockPrisma.task.update.mockResolvedValue({
        id: 'task-1',
        status: 'DONE',
        completedAt: new Date(),
      });
      mockPrisma.activity.create.mockResolvedValue({});

      await service.update('task-1', { status: 'DONE' as any }, 'user-1');

      const updateCall = mockPrisma.task.update.mock.calls[0]![0];
      expect(updateCall.data.status).toBe('DONE');
      expect(updateCall.data.completedAt).toBeInstanceOf(Date);

      // Activity logged
      expect(mockPrisma.activity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'TASK_STATUS_CHANGED',
          }),
        }),
      );
    });

    it('should clear completedAt when re-opened from DONE', async () => {
      mockPrisma.task.findUnique.mockResolvedValue({
        id: 'task-1',
        status: 'DONE',
        assigneeId: null,
        projectId: 'proj-1',
        title: 'Test task',
      });
      mockPrisma.task.update.mockResolvedValue({
        id: 'task-1',
        status: 'TODO',
        completedAt: null,
      });
      mockPrisma.activity.create.mockResolvedValue({});

      await service.update('task-1', { status: 'TODO' as any }, 'user-1');

      const updateCall = mockPrisma.task.update.mock.calls[0]![0];
      expect(updateCall.data.completedAt).toBeNull();
    });
  });

  // ════════════════════════════════════════════════════════
  // TEST 5: Assignee validation
  // ════════════════════════════════════════════════════════

  describe('create — assignee validation', () => {
    it('should reject assignee who is not a team member', async () => {
      mockPrisma.project.findUnique.mockResolvedValue({ teamId: 'team-1' });
      mockPrisma.teamMember.findUnique.mockResolvedValue(null); // not a member

      await expect(
        service.create('proj-1', { title: 'Test', assigneeId: 'outsider' } as any, 'user-1'),
      ).rejects.toThrow(/member of the project team/);
    });
  });

  // ════════════════════════════════════════════════════════
  // TEST 6: Move endpoint
  // ════════════════════════════════════════════════════════

  describe('move', () => {
    it('should update status and position', async () => {
      mockPrisma.task.findUnique.mockResolvedValue({
        id: 'task-1',
        status: 'TODO',
        title: 'Test',
      });
      mockPrisma.task.update.mockResolvedValue({
        id: 'task-1',
        status: 'IN_PROGRESS',
        position: 2048,
      });
      mockPrisma.activity.create.mockResolvedValue({});

      await service.move('task-1', { status: 'IN_PROGRESS' as any, position: 2048 }, 'user-1');

      expect(mockPrisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'IN_PROGRESS',
            position: 2048,
            startedAt: expect.any(Date),
          }),
        }),
      );
    });
  });
});
