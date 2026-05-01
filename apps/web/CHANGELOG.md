# Changelog

All notable changes to Tasklane are documented here.

## v1.2.0 — 2026-04-30

### ✨ UX Polish

- **Skeleton Loaders**: Replaced all spinners with shape-matched skeleton loaders across dashboard, kanban board, list view, calendar, analytics, notifications, activity feed, and task detail dialog. Shimmer animation with `prefers-reduced-motion` support.
- **Empty States**: Every list/grid now has a proper empty state with icon, heading, description, and contextual CTA. Includes custom states for kanban columns, notifications ("You're all caught up"), and activity feed.
- **Error Boundaries**: Added global `error.tsx`, `not-found.tsx` (404), project-scoped error boundary, and reusable `<InlineError />` primitive for widget-level crashes.
- **Keyboard Shortcuts**: Full shortcut system with `g d` (dashboard), `g p` (projects), `g i` (notifications), `?` (help overlay), `c` (create task), `/` (search). Overlay shows 4-section 2-column grid with styled `<kbd>` elements.
- **Number Count-up**: Stat cards on the dashboard now animate from 0 to their value with an easeOutCubic curve on first mount.
- **Focus Rings**: All interactive elements now show `focus-visible` rings using the primary color, not on mouse click.
- **Skip Link**: "Skip to main content" link for screen readers appears on Tab from page top.
- **Theme Transitions**: Dark ↔ light mode now transitions smoothly over 200ms instead of snapping.

## v1.1.0 — 2026-04-29

### 🔔 Real-Time Notifications

- Full notifications engine: Redis-backed deduplication, @mention parsing, email triggers, hourly digest cron.
- In-app notification bell with real-time socket delivery.
- Notifications page with date-grouping, type/read filters, infinite scroll.
- Notification preferences with per-channel (in-app + email) toggles.
- Team activity feed with real-time prepend and entity type filtering.
- `MentionInput` component with `@` trigger and keyboard-navigable member picker.

## v1.0.0 — 2026-04-28

### 🚀 Initial Release

- **Auth**: Email/password registration, login, JWT tokens, 2FA (TOTP), refresh token rotation, email verification, password reset.
- **Teams**: Create teams, invite members, role-based access (Admin, Member), slug-based URLs.
- **Projects**: CRUD, color coding, project keys, label management.
- **Tasks**: Full lifecycle (Backlog → Done), priority, due dates, assignees, subtasks, comments, labels, file attachments.
- **Board Views**: Kanban (drag-drop), list view (sortable columns), calendar view.
- **Real-time**: Socket.io presence, cursor sharing, live task updates.
- **AI Features**: Groq-powered task breakdown, description generation, standup reports.
- **Analytics**: Team dashboard with burndown, throughput, cycle time distribution, workload heatmap, priority/status donuts. PDF + CSV export.
- **Personal Dashboard**: KPI stat cards with sparklines, My Day (drag-reorder), quick capture, recent activity, upcoming tasks.
