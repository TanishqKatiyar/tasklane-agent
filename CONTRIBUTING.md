# Contributing to Tasklane

We appreciate your interest in contributing to Tasklane. We hold this codebase to exceptional engineering standards. This guide details how you can align with our workflows and expectations.

## ⟡ Engineering Standards

1. **Type Safety is Non-Negotiable**: We enforce strict end-to-end type safety. All DTOs and database models must share single sources of truth in `packages/shared`. Any use of `any` or `@ts-ignore` will block your PR.
2. **Minimalism & Intent**: Do not introduce new dependencies without significant justification. If a feature can be elegantly written in 50 lines of vanilla JavaScript, do not import a 5MB library.
3. **Design System Fidelity**: Any frontend modifications must strictly adhere to our "Paper & Ink" design tokens in `globals.css`. Do not introduce ad-hoc hex codes or unapproved Tailwind colors.

## 🛠 Branching Strategy

We use a linear branch model:

- `main` is perpetually ready for production.
- Feature branches must be scoped to a single concern.
- Naming convention: `feat/<feature-name>`, `fix/<bug-name>`, `chore/<task-name>`.

## ✍️ Commit Guidelines

We enforce Conventional Commits. A valid commit message ensures automated changelog generation and maintains a pristine git history.

Format:
`<type>(<scope>): <subject>`

Example:
`feat(api): implement distributed rate limiting for auth endpoints`

Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`.

## 🚀 Submitting a Pull Request

1. **Ensure Local Checks Pass**: Run `pnpm lint`, `pnpm typecheck`, and `pnpm format:check`.
2. **Detailed PR Description**: Use our Pull Request Template. Explain _why_ the change exists, not just _what_ changed.
3. **Review Process**: PRs require at least one senior code review. Feedback is direct and focused on architectural integrity.

Thank you for helping us maintain a world-class standard.
