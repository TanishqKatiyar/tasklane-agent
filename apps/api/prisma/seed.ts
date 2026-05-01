import {
  PrismaClient,
  SystemRole,
  TaskPriority,
  TaskStatus,
  TeamRole,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import process from 'process';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database…\n');

  const hash = await bcrypt.hash('Admin123!', 12);

  // ── Users ──────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: 'admin@tasklane.dev' },
    update: {},
    create: {
      email: 'admin@tasklane.dev',
      passwordHash: hash,
      name: 'Admin User',
      systemRole: SystemRole.SUPER_ADMIN,
      emailVerified: true,
    },
  });
  console.log(`  ✅ Admin  : ${admin.email} (${admin.id})`);

  const alice = await prisma.user.upsert({
    where: { email: 'alice@tasklane.dev' },
    update: {},
    create: {
      email: 'alice@tasklane.dev',
      passwordHash: hash,
      name: 'Alice Johnson',
      emailVerified: true,
    },
  });
  console.log(`  ✅ Alice  : ${alice.email} (${alice.id})`);

  const bob = await prisma.user.upsert({
    where: { email: 'bob@tasklane.dev' },
    update: {},
    create: {
      email: 'bob@tasklane.dev',
      passwordHash: hash,
      name: 'Bob Smith',
      emailVerified: true,
    },
  });
  console.log(`  ✅ Bob    : ${bob.email} (${bob.id})`);

  // ── Team ───────────────────────────────────────────────
  const team = await prisma.team.upsert({
    where: { slug: 'acme-inc' },
    update: {},
    create: {
      name: 'Acme Inc',
      slug: 'acme-inc',
      description: 'The everything company',
      ownerId: admin.id,
    },
  });
  console.log(`\n  ✅ Team   : ${team.name} (${team.slug})`);

  // ── Team Members ───────────────────────────────────────
  for (const { userId, role } of [
    { userId: admin.id, role: TeamRole.ADMIN },
    { userId: alice.id, role: TeamRole.MEMBER },
    { userId: bob.id, role: TeamRole.MEMBER },
  ] as const) {
    await prisma.teamMember.upsert({
      where: { teamId_userId: { teamId: team.id, userId } },
      update: {},
      create: { teamId: team.id, userId, role },
    });
  }
  console.log('  ✅ Members: admin (ADMIN), alice (MEMBER), bob (MEMBER)');

  // ── Project ────────────────────────────────────────────
  const project = await prisma.project.upsert({
    where: { teamId_key: { teamId: team.id, key: 'MARK' } },
    update: {},
    create: {
      name: 'Marketing Campaign',
      key: 'MARK',
      description: 'Q3 2026 product launch campaign',
      color: '#6366f1',
      teamId: team.id,
    },
  });
  console.log(`\n  ✅ Project: ${project.name} (${project.key})`);

  // ── Labels ─────────────────────────────────────────────
  const labelDefs = [
    { name: 'Bug', color: '#ef4444' },
    { name: 'Feature', color: '#3b82f6' },
    { name: 'Urgent', color: '#f97316' },
  ];
  const labels: Record<string, string> = {};
  for (const l of labelDefs) {
    const created = await prisma.label.upsert({
      where: { id: `seed-label-${l.name.toLowerCase()}` },
      update: {},
      create: { id: `seed-label-${l.name.toLowerCase()}`, ...l },
    });
    labels[l.name] = created.id;
  }
  console.log('  ✅ Labels : Bug, Feature, Urgent');

  // ── Tasks ──────────────────────────────────────────────
  const tasks = [
    {
      number: 1,
      title: 'Design landing page mockups',
      description: 'Create Figma mockups for the campaign landing page',
      priority: TaskPriority.HIGH,
      status: TaskStatus.DONE,
      assigneeId: alice.id,
      position: 1000,
    },
    {
      number: 2,
      title: 'Write blog post for launch',
      description: 'Draft a 1500-word blog post announcing the new product',
      priority: TaskPriority.MEDIUM,
      status: TaskStatus.IN_PROGRESS,
      assigneeId: bob.id,
      position: 1000,
    },
    {
      number: 3,
      title: 'Set up email campaign in Resend',
      description: 'Configure drip campaign with 3-email sequence',
      priority: TaskPriority.HIGH,
      status: TaskStatus.TODO,
      assigneeId: alice.id,
      position: 1000,
    },
    {
      number: 4,
      title: 'Social media content calendar',
      description: 'Plan 2 weeks of social media posts across platforms',
      priority: TaskPriority.LOW,
      status: TaskStatus.BACKLOG,
      assigneeId: null as string | null,
      position: 1000,
    },
    {
      number: 5,
      title: 'Review analytics dashboard',
      description: 'Verify tracking pixels and conversion goals are set up',
      priority: TaskPriority.URGENT,
      status: TaskStatus.IN_REVIEW,
      assigneeId: bob.id,
      position: 1000,
    },
  ];

  for (const task of tasks) {
    await prisma.task.upsert({
      where: {
        projectId_number: { projectId: project.id, number: task.number },
      },
      update: {},
      create: {
        ...task,
        projectId: project.id,
        creatorId: admin.id,
        ...(task.status === TaskStatus.DONE
          ? { completedAt: new Date() }
          : {}),
      },
    });
  }
  console.log('  ✅ Tasks  : 5 tasks across all statuses');

  console.log('\n🎉 Seed complete!\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
