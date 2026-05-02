# Tasklane: A High-Fidelity Task Management Platform

![Tasklane Banner](https://via.placeholder.com/1200x400/1a1a1a/ffffff?text=Tasklane+Studio-Grade+Architecture)

> A production-ready, enterprise-grade task management platform engineered with a focus on deep architectural scalability and uncompromising typographic elegance.

Tasklane is not just another productivity tool—it is a demonstration of how high-end editorial aesthetics (inspired by the likes of Stripe Press and Shelby.xyz) can be seamlessly merged with rigorous, modern full-stack engineering. It features a completely custom kinetic UI, real-time data synchronization, and a deeply decoupled monorepo architecture.

---

## 🧠 Architectural Overview

Built to scale, Tasklane utilizes a **Turborepo Monorepo** structure, strictly separating concerns while sharing critical type definitions and validation schemas across the stack.

### 1. The Frontend (`apps/web`)

- **Framework**: Next.js 14 (App Router) + React 18
- **State Management**: Zustand (Global UI state) + TanStack React Query (Server state & caching)
- **Styling & UI**: TailwindCSS + Framer Motion + Radix UI Primitives
- **Aesthetics**: A custom dual-tone palette (Crimson Red & Warm Stone), glassmorphism, SVG grain textures, and editorial typography (Fraunces & Space Grotesk).
- **Interactivity**: Fully accessible drag-and-drop capabilities via `@dnd-kit`, paired with 60fps hardware-accelerated micro-animations.

### 2. The Backend (`apps/api`)

- **Framework**: NestJS (Node.js)
- **Database & ORM**: PostgreSQL managed via Prisma ORM
- **Caching & Real-time**: Redis (Upstash) for sub-millisecond dashboard analytics caching.
- **Security**: Robust JWT-based authentication using secure HTTP-only cookies, strict CORS policies, and Bcrypt password hashing.
- **Design Pattern**: Domain-Driven Design (DDD) with strictly decoupled modules, controllers, and injectable services.

### 3. The Shared Layer (`packages/shared`)

- A single-source-of-truth package utilizing **Zod** schemas and TypeScript interfaces. This ensures that any API contract changes immediately throw compile-time errors across both the frontend and backend, guaranteeing 100% End-to-End Type Safety.

---

## ✨ Key Engineering Highlights

### 1. "Self-Healing" Deployment Infrastructure

Engineered for zero-maintenance CI/CD. The backend (hosted on Render) is configured with a custom startup execution lifecycle that automatically applies Prisma migrations and intelligently seeds complex, professional demo data before accepting traffic. If the database is ever wiped, the system self-heals and repopulates instantly on the next boot.

### 2. "Vital Signs" Algorithmic Analytics

The backend doesn't just store tasks; it processes them. The analytics engine queries the PostgreSQL database and Redis cache to generate real-time metrics (Overdue, Due This Week, Open, Completed), calculating complex delta-comparisons against previous weeks to provide users with actionable performance trends.

### 3. Uncompromising Studio-Grade UI/UX

I engineered the interface to feel expensive and premium:

- **Editorial Typography**: Replacing standard sans-serifs with high-contrast, kinetic typography (Fraunces).
- **Textural Depth**: Implemented algorithmic SVG noise grain overlays and dynamic background grids.
- **Liquid Animations**: Replaced static transitions with physics-based spring animations using Framer Motion.

---

## 🚀 Quick Start (Local Development)

The repository uses `pnpm` workspaces.

```bash
# 1. Install dependencies across the entire monorepo
pnpm install

# 2. Setup your environmental variables
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# 3. Start the local PostgreSQL & Redis instances (Docker)
docker-compose up -d

# 4. Migrate the database and generate Prisma types
pnpm --filter @tasklane/api run prisma:generate
pnpm --filter @tasklane/api run prisma:migrate

# 5. Start the development servers concurrently (Turbo)
pnpm run dev
```

---

## 🌍 Production Environments

- **Frontend**: Deployed globally to the Vercel Edge Network for optimal TTFB (Time to First Byte).
- **Backend**: Hosted on Render with secure origins restricting access strictly to the Vercel production URL.
- **Database**: Fully managed PostgreSQL cluster on Render.

## 🧑‍💻 Author & Engineering Philosophy

This project was built to demonstrate that "business software" does not have to be visually sterile. By treating code as a craft, Tasklane bridges the gap between a high-performing distributed backend and an emotionally engaging, award-winning frontend experience.

It proves that complex state management, relational databases, and secure APIs can coexist with the meticulous polish usually reserved for high-budget creative agencies.
