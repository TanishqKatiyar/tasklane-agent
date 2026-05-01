import type { Label,Project, Task, User } from "./types";

// ── Mock users ──
export const MOCK_USERS: User[] = [
  { id: "u1", name: "Alice Johnson", email: "alice@tasklane.dev", avatarUrl: null },
  { id: "u2", name: "Bob Smith", email: "bob@tasklane.dev", avatarUrl: null },
  { id: "u3", name: "Carol Williams", email: "carol@tasklane.dev", avatarUrl: null },
  { id: "u4", name: "Dan Chen", email: "dan@tasklane.dev", avatarUrl: null },
];

// ── Mock labels ──
export const MOCK_LABELS: Label[] = [
  { id: "l1", name: "Bug", color: "#EF4444" },
  { id: "l2", name: "Feature", color: "#6366F1" },
  { id: "l3", name: "Enhancement", color: "#22C55E" },
  { id: "l4", name: "Documentation", color: "#F59E0B" },
  { id: "l5", name: "Design", color: "#EC4899" },
];

// ── Mock project ──
export const MOCK_PROJECT: Project = {
  id: "proj_marketing",
  name: "Marketing Site",
  key: "MARK",
  description: "Company marketing website redesign",
  status: "ACTIVE",
  color: "#6366f1",
  teamId: "team1",
};

// ── Mock tasks ──
const now = new Date();
const tomorrow = new Date(now.getTime() + 86400000);
const yesterday = new Date(now.getTime() - 86400000);
const nextWeek = new Date(now.getTime() + 7 * 86400000);
const twoDays = new Date(now.getTime() + 2 * 86400000);

export const MOCK_TASKS: Task[] = [
  {
    id: "t1", projectId: "proj_marketing", number: 1,
    title: "Design hero section with animated gradient mesh",
    description: "Create a visually stunning hero section using CSS gradient animations",
    status: "DONE", priority: "HIGH", position: 1000,
    assigneeId: "u1", assignee: MOCK_USERS[0], creatorId: "u1",
    dueDate: yesterday.toISOString(),
    labels: [MOCK_LABELS[4]], commentCount: 5, subtaskCount: 3, subtaskDoneCount: 3,
    createdAt: now.toISOString(), updatedAt: now.toISOString(),
  },
  {
    id: "t2", projectId: "proj_marketing", number: 2,
    title: "Implement responsive navigation with mobile hamburger menu",
    description: "Navigation should collapse to hamburger on mobile",
    status: "IN_PROGRESS", priority: "HIGH", position: 1000,
    assigneeId: "u2", assignee: MOCK_USERS[1], creatorId: "u1",
    dueDate: twoDays.toISOString(),
    labels: [MOCK_LABELS[1]], commentCount: 3, subtaskCount: 4, subtaskDoneCount: 2,
    createdAt: now.toISOString(), updatedAt: now.toISOString(),
  },
  {
    id: "t3", projectId: "proj_marketing", number: 3,
    title: "Set up CI/CD pipeline for preview deployments",
    description: "Configure GitHub Actions with Vercel preview deployments on each PR",
    status: "TODO", priority: "MEDIUM", position: 1000,
    assigneeId: "u3", assignee: MOCK_USERS[2], creatorId: "u1",
    dueDate: nextWeek.toISOString(),
    labels: [], commentCount: 1, subtaskCount: 0, subtaskDoneCount: 0,
    createdAt: now.toISOString(), updatedAt: now.toISOString(),
  },
  {
    id: "t4", projectId: "proj_marketing", number: 4,
    title: "Write API documentation for REST endpoints",
    description: null,
    status: "BACKLOG", priority: "LOW", position: 1000,
    assigneeId: null, assignee: null, creatorId: "u1",
    dueDate: null,
    labels: [MOCK_LABELS[3]], commentCount: 0, subtaskCount: 0, subtaskDoneCount: 0,
    createdAt: now.toISOString(), updatedAt: now.toISOString(),
  },
  {
    id: "t5", projectId: "proj_marketing", number: 5,
    title: "Fix broken image lazy loading on Safari 16",
    description: "Images don't load on Safari 16 when IntersectionObserver threshold is set",
    status: "IN_REVIEW", priority: "URGENT", position: 1000,
    assigneeId: "u1", assignee: MOCK_USERS[0], creatorId: "u2",
    dueDate: yesterday.toISOString(),
    labels: [MOCK_LABELS[0]], commentCount: 8, subtaskCount: 1, subtaskDoneCount: 1,
    createdAt: now.toISOString(), updatedAt: now.toISOString(),
  },
  {
    id: "t6", projectId: "proj_marketing", number: 6,
    title: "Add dark mode support to all components",
    description: "Ensure all components respect the dark/light theme toggle",
    status: "TODO", priority: "HIGH", position: 2000,
    assigneeId: "u4", assignee: MOCK_USERS[3], creatorId: "u1",
    dueDate: tomorrow.toISOString(),
    labels: [MOCK_LABELS[2]], commentCount: 2, subtaskCount: 6, subtaskDoneCount: 1,
    createdAt: now.toISOString(), updatedAt: now.toISOString(),
  },
  {
    id: "t7", projectId: "proj_marketing", number: 7,
    title: "Implement contact form with validation",
    description: "React Hook Form + Zod validation, email notification on submit",
    status: "IN_PROGRESS", priority: "MEDIUM", position: 2000,
    assigneeId: "u3", assignee: MOCK_USERS[2], creatorId: "u2",
    dueDate: nextWeek.toISOString(),
    labels: [MOCK_LABELS[1]], commentCount: 0, subtaskCount: 2, subtaskDoneCount: 0,
    createdAt: now.toISOString(), updatedAt: now.toISOString(),
  },
  {
    id: "t8", projectId: "proj_marketing", number: 8,
    title: "Performance audit and Core Web Vitals optimization",
    description: "Run Lighthouse, fix LCP/CLS/FID issues",
    status: "BACKLOG", priority: "MEDIUM", position: 2000,
    assigneeId: "u2", assignee: MOCK_USERS[1], creatorId: "u1",
    dueDate: null,
    labels: [], commentCount: 0, subtaskCount: 0, subtaskDoneCount: 0,
    createdAt: now.toISOString(), updatedAt: now.toISOString(),
  },
  {
    id: "t9", projectId: "proj_marketing", number: 9,
    title: "Create pricing page with toggle annual/monthly",
    description: null,
    status: "TODO", priority: "LOW", position: 3000,
    assigneeId: null, assignee: null, creatorId: "u1",
    dueDate: nextWeek.toISOString(),
    labels: [MOCK_LABELS[4]], commentCount: 4, subtaskCount: 0, subtaskDoneCount: 0,
    createdAt: now.toISOString(), updatedAt: now.toISOString(),
  },
  {
    id: "t10", projectId: "proj_marketing", number: 10,
    title: "Integrate analytics tracking (Mixpanel + GA4)",
    description: "Set up event tracking for all CTA clicks and page views",
    status: "BACKLOG", priority: "LOW", position: 3000,
    assigneeId: null, assignee: null, creatorId: "u1",
    dueDate: null,
    labels: [], commentCount: 0, subtaskCount: 0, subtaskDoneCount: 0,
    createdAt: now.toISOString(), updatedAt: now.toISOString(),
  },
  {
    id: "t11", projectId: "proj_marketing", number: 11,
    title: "Blog section with MDX support",
    description: "Set up content layer with MDX, syntax highlighting, and RSS feed",
    status: "BACKLOG", priority: "MEDIUM", position: 4000,
    assigneeId: "u4", assignee: MOCK_USERS[3], creatorId: "u1",
    dueDate: null,
    labels: [MOCK_LABELS[1]], commentCount: 2, subtaskCount: 3, subtaskDoneCount: 0,
    createdAt: now.toISOString(), updatedAt: now.toISOString(),
  },
  {
    id: "t12", projectId: "proj_marketing", number: 12,
    title: "SEO meta tags and Open Graph images",
    description: "Dynamic OG images using @vercel/og",
    status: "DONE", priority: "MEDIUM", position: 2000,
    assigneeId: "u1", assignee: MOCK_USERS[0], creatorId: "u1",
    dueDate: yesterday.toISOString(),
    labels: [MOCK_LABELS[2]], commentCount: 1, subtaskCount: 0, subtaskDoneCount: 0,
    createdAt: now.toISOString(), updatedAt: now.toISOString(),
  },
];
