import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { FilterBar } from '@/components/board/filter-bar';
import type { Label, TaskFilters, User } from '@/lib/types';

const mockMembers: User[] = [
  { id: 'u1', name: 'Alice Cooper', email: 'alice@test.com' },
  { id: 'u2', name: 'Bob Smith', email: 'bob@test.com' },
];

const mockLabels: Label[] = [
  { id: 'l1', name: 'Bug', color: '#ef4444' },
  { id: 'l2', name: 'Feature', color: '#3b82f6' },
];

describe('FilterBar', () => {
  it('renders search input and filter buttons', () => {
    const onChange = vi.fn();

    render(
      <FilterBar
        filters={{}}
        onFiltersChange={onChange}
        members={mockMembers}
        labels={mockLabels}
      />,
    );

    expect(screen.getByPlaceholderText('Search tasks…')).toBeInTheDocument();
    expect(screen.getByText('Assignee')).toBeInTheDocument();
    expect(screen.getByText('Priority')).toBeInTheDocument();
    expect(screen.getByText('Label')).toBeInTheDocument();
  });

  it('calls onFiltersChange when search text is entered', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <FilterBar
        filters={{}}
        onFiltersChange={onChange}
        members={mockMembers}
        labels={mockLabels}
      />,
    );

    const searchInput = screen.getByPlaceholderText('Search tasks…');
    await user.type(searchInput, 'f');

    // Each keystroke fires onChange with the current input value
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ search: 'f' });
  });

  it('shows "Clear filters" button when filters are active', () => {
    const onChange = vi.fn();
    const activeFilters: TaskFilters = {
      search: 'bug',
    };

    render(
      <FilterBar
        filters={activeFilters}
        onFiltersChange={onChange}
        members={mockMembers}
        labels={mockLabels}
      />,
    );

    expect(screen.getByText('Clear filters')).toBeInTheDocument();
  });

  it('does NOT show "Clear filters" when no filters are active', () => {
    const onChange = vi.fn();

    render(
      <FilterBar
        filters={{}}
        onFiltersChange={onChange}
        members={mockMembers}
        labels={mockLabels}
      />,
    );

    expect(screen.queryByText('Clear filters')).not.toBeInTheDocument();
  });

  it('clears all filters when "Clear filters" is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <FilterBar
        filters={{ search: 'bug', priorities: ['HIGH'] }}
        onFiltersChange={onChange}
        members={mockMembers}
        labels={mockLabels}
      />,
    );

    await user.click(screen.getByText('Clear filters'));

    // Should call onChange with empty filters
    expect(onChange).toHaveBeenCalledWith({});
  });

  it('opens priority dropdown and shows options', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <FilterBar
        filters={{}}
        onFiltersChange={onChange}
        members={mockMembers}
        labels={mockLabels}
      />,
    );

    await user.click(screen.getByText('Priority'));

    // Should show all priority options
    expect(screen.getByText('Urgent')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.getByText('Low')).toBeInTheDocument();
  });

  it('selecting a priority calls onFiltersChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <FilterBar
        filters={{}}
        onFiltersChange={onChange}
        members={mockMembers}
        labels={mockLabels}
      />,
    );

    // Open priority dropdown
    await user.click(screen.getByText('Priority'));

    // Click "High"
    await user.click(screen.getByText('High'));

    expect(onChange).toHaveBeenCalledWith({
      priorities: ['HIGH'],
    });
  });

  it('shows filter count badge when priorities are selected', () => {
    const onChange = vi.fn();

    render(
      <FilterBar
        filters={{ priorities: ['HIGH', 'URGENT'] }}
        onFiltersChange={onChange}
        members={mockMembers}
        labels={mockLabels}
      />,
    );

    // The "2" badge should be shown near Priority
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});
