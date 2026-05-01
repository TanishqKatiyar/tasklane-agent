import { NotificationsService } from './notifications.service';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockCreate = jest.fn();
const mockIncrClient: Record<string, number> = {};

const mockRedis = {
  incr: jest.fn(async (key: string) => {
    mockIncrClient[key] = (mockIncrClient[key] ?? 0) + 1;
    return mockIncrClient[key];
  }),
  expire: jest.fn(),
};

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => mockRedis);
});

const mockPrisma = {
  notification: {
    create: mockCreate,
    findMany: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
  },
  notificationPreference: {
    findUnique: jest.fn().mockResolvedValue({
      taskAssignedEmail: true,
      taskAssignedInApp: true,
      mentionEmail: true,
      mentionInApp: true,
      commentEmail: false,
      commentInApp: true,
      dueDateEmail: true,
      dueDateInApp: true,
      teamUpdateEmail: false,
      teamUpdateInApp: true,
    }),
    upsert: jest.fn(),
    create: jest.fn(),
  },
};

const mockEventBus = {
  emitNotificationEvent: jest.fn(),
};

const mockEmail = {
  send: jest.fn(),
};

const mockConfig = {
  get: jest.fn((key: string, def?: string) => def ?? 'test-secret'),
};

describe('NotificationsService – dedupe logic', () => {
  let service: NotificationsService;

  beforeEach(async () => {
    // Reset counters
    Object.keys(mockIncrClient).forEach((k) => delete mockIncrClient[k]);
    mockCreate.mockClear();
    mockCreate.mockResolvedValue({ id: 'notif-1', userId: 'u1', type: 'TASK_ASSIGNED' });
    mockRedis.incr.mockClear();

    // Directly construct the service to avoid NestJS DI module resolution issues
    // (the service uses forwardRef and Redis in constructor)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    service = new (NotificationsService as any)(mockPrisma, mockEventBus, mockEmail, mockConfig);
    // Inject mocked redis manually
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as any).redis = mockRedis;
  });

  it('creates a notification on first call', async () => {
    await service.create({
      userId: 'user-bob',
      type: 'TASK_ASSIGNED',
      title: 'Task assigned',
      body: 'You were assigned',
      taskId: 'task-1',
      actorId: 'user-alice',
    });
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('collapses after 5 rapid identical calls (dedupe)', async () => {
    const dto = {
      userId: 'user-bob',
      type: 'TASK_ASSIGNED',
      title: 'Task assigned',
      body: 'You were assigned',
      taskId: 'task-999',
      actorId: 'user-alice',
    };

    for (let i = 0; i < 8; i++) {
      await service.create(dto);
    }

    // Calls 1-5 pass dedupe (count 1-5), calls 6-8 are blocked (count > 5)
    expect(mockCreate.mock.calls.length).toBeLessThanOrEqual(5);
  });

  it('never notifies actor for their own action (self-assign guard)', async () => {
    await service.create({
      userId: 'user-alice',
      type: 'TASK_ASSIGNED',
      title: 'Task assigned',
      body: 'You assigned yourself',
      taskId: 'task-2',
      actorId: 'user-alice', // same person!
    });
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
