import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { Task } from '@/lib/types';

// ── Mock dnd-kit (sortable needs context) ──
vi.mock('@dnd-kit/sortable', () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: () => undefined,
    },
  },
}));

// ── Mock framer-motion ──
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { layoutId: _layoutId, ...rest } = props;
      return <div {...(rest as Record<string, unknown>)}>{children}</div>;
    },
  },
}));

// ── Import after mocks ──
/* eslint-disable import/first */
import { TaskCard } from '@/components/board/task-card';
/* eslint-enable import/first */

// ── Test Data ──
const baseTask: Task = {
  id: 'task-1',
  projectId: 'proj-1',
  number: 42,
  title: 'Fix login page crash',
  description: 'The login page crashes on mobile browsers',
  status: 'TODO',
  priority: 'HIGH',
  position: 1024,
  creatorId: 'user-1',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('TaskCard', () => {
  it('renders task title and priority badge', () => {
    render(<TaskCard task={baseTask} projectKey="PROJ" />);

    expect(screen.getByText('Fix login page crash')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('renders task ID from projectKey and number', () => {
    render(<TaskCard task={baseTask} projectKey="TL" />);

    expect(screen.getByText('TL-42')).toBeInTheDocument();
  });

  it('renders description when present', () => {
    render(<TaskCard task={baseTask} projectKey="PROJ" />);

    expect(screen.getByText('The login page crashes on mobile browsers')).toBeInTheDocument();
  });

  it('does NOT render description when absent', () => {
    const taskNoDesc = { ...baseTask, description: null };
    render(<TaskCard task={taskNoDesc} projectKey="PROJ" />);

    expect(screen.queryByText('The login page crashes on mobile browsers')).not.toBeInTheDocument();
  });

  it('renders assignee initials', () => {
    const taskWithAssignee: Task = {
      ...baseTask,
      assigneeId: 'user-2',
      assignee: { id: 'user-2', name: 'John Doe', email: 'john@example.com' },
    };

    render(<TaskCard task={taskWithAssignee} projectKey="PROJ" />);

    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('renders labels when present', () => {
    const taskWithLabels: Task = {
      ...baseTask,
      labels: [
        { id: 'l1', name: 'Bug', color: '#ef4444' },
        { id: 'l2', name: 'Frontend', color: '#3b82f6' },
      ],
    };

    render(<TaskCard task={taskWithLabels} projectKey="PROJ" />);

    expect(screen.getByText('Bug')).toBeInTheDocument();
    expect(screen.getByText('Frontend')).toBeInTheDocument();
  });

  it('renders comment and subtask counts', () => {
    const taskWithCounts: Task = {
      ...baseTask,
      commentCount: 3,
      subtaskCount: 5,
      subtaskDoneCount: 2,
    };

    render(<TaskCard task={taskWithCounts} projectKey="PROJ" />);

    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('2/5')).toBeInTheDocument();
  });

  it('calls onClick when card is clicked', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<TaskCard task={baseTask} projectKey="PROJ" onClick={handleClick} />);

    await user.click(screen.getByText('Fix login page crash'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders overdue styling for past due dates', () => {
    const overdueTask: Task = {
      ...baseTask,
      dueDate: '2020-01-01T00:00:00Z', // definitely past
      status: 'TODO',
    };

    const { container } = render(<TaskCard task={overdueTask} projectKey="PROJ" />);

    // The overdue chip should have red styling
    const dueDateChip = container.querySelector('.text-red-400');
    expect(dueDateChip).toBeInTheDocument();
    expect(dueDateChip?.textContent).toContain('overdue');
  });

  it('does NOT show overdue for completed tasks', () => {
    const doneTask: Task = {
      ...baseTask,
      dueDate: '2020-01-01T00:00:00Z',
      status: 'DONE',
    };

    const { container } = render(<TaskCard task={doneTask} projectKey="PROJ" />);

    const overdueChip = container.querySelector('.text-red-400');
    expect(overdueChip).not.toBeInTheDocument();
  });
});
