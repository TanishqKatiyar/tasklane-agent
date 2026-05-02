import { PrismaClient, SystemRole, TaskPriority, TaskStatus, TeamRole, ActivityType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import process from 'process';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding production database with rich demo data…\n');

  const hash = await bcrypt.hash('Admin123!', 12);

  // ── 1. Users ──────────────────────────────────────────────
  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'admin@tasklane.dev' },
      update: { name: 'Admin User' },
      create: { email: 'admin@tasklane.dev', passwordHash: hash, name: 'Admin User', systemRole: SystemRole.SUPER_ADMIN, emailVerified: true },
    }),
    prisma.user.upsert({
      where: { email: 'alice@tasklane.dev' },
      update: { name: 'Alice (Design)' },
      create: { email: 'alice@tasklane.dev', passwordHash: hash, name: 'Alice (Design)', emailVerified: true },
    }),
    prisma.user.upsert({
      where: { email: 'bob@tasklane.dev' },
      update: { name: 'Bob (Engineering)' },
      create: { email: 'bob@tasklane.dev', passwordHash: hash, name: 'Bob (Engineering)', emailVerified: true },
    }),
    prisma.user.upsert({
      where: { email: 'charlie@tasklane.dev' },
      update: { name: 'Charlie (Marketing)' },
      create: { email: 'charlie@tasklane.dev', passwordHash: hash, name: 'Charlie (Marketing)', emailVerified: true },
    })
  ]);

  const [admin, alice, bob, charlie] = users;
  console.log('  ✅ Users created');

  // ── 2. Teams ───────────────────────────────────────────────
  const teamsData = [
    { slug: 'acme-core', name: 'Acme Core Engine', desc: 'Main product development team' },
    { slug: 'acme-growth', name: 'Acme Growth', desc: 'Marketing and user acquisition' }
  ];

  const teams = await Promise.all(teamsData.map(t => 
    prisma.team.upsert({
      where: { slug: t.slug },
      update: { name: t.name, description: t.desc },
      create: { name: t.name, slug: t.slug, description: t.desc, ownerId: admin.id }
    })
  ));
  
  const [coreTeam, growthTeam] = teams;
  console.log('  ✅ Teams created');

  // ── 3. Team Members ───────────────────────────────────────
  const members = [
    { teamId: coreTeam.id, userId: admin.id, role: TeamRole.ADMIN },
    { teamId: coreTeam.id, userId: alice.id, role: TeamRole.MEMBER },
    { teamId: coreTeam.id, userId: bob.id, role: TeamRole.MEMBER },
    { teamId: growthTeam.id, userId: admin.id, role: TeamRole.ADMIN },
    { teamId: growthTeam.id, userId: charlie.id, role: TeamRole.MEMBER },
    { teamId: growthTeam.id, userId: alice.id, role: TeamRole.MEMBER },
  ];

  for (const m of members) {
    await prisma.teamMember.upsert({
      where: { teamId_userId: { teamId: m.teamId, userId: m.userId } },
      update: { role: m.role },
      create: { teamId: m.teamId, userId: m.userId, role: m.role },
    });
  }
  console.log('  ✅ Team Members assigned');

  // ── 4. Projects ────────────────────────────────────────────
  const projectsData = [
    { teamId: coreTeam.id, key: 'V2', name: 'Platform V2 Release', color: '#6366f1' },
    { teamId: coreTeam.id, key: 'MOB', name: 'Mobile App Beta', color: '#10b981' },
    { teamId: growthTeam.id, key: 'Q3', name: 'Q3 Marketing Push', color: '#f59e0b' },
    { teamId: growthTeam.id, key: 'SEO', name: 'SEO Optimization', color: '#ec4899' },
  ];

  const projects = await Promise.all(projectsData.map(p => 
    prisma.project.upsert({
      where: { teamId_key: { teamId: p.teamId, key: p.key } },
      update: { name: p.name, color: p.color },
      create: { name: p.name, key: p.key, color: p.color, teamId: p.teamId }
    })
  ));
  console.log('  ✅ Projects created');

  // ── 5. Labels ─────────────────────────────────────────────
  const labelDefs = [
    { name: 'Bug', color: '#ef4444' },
    { name: 'Feature', color: '#3b82f6' },
    { name: 'Design', color: '#8b5cf6' },
    { name: 'Urgent', color: '#f97316' },
    { name: 'Copy', color: '#14b8a6' },
  ];
  const labels: Record<string, string> = {};
  for (const l of labelDefs) {
    const created = await prisma.label.upsert({
      where: { id: `seed-label-${l.name.toLowerCase()}` },
      update: { color: l.color },
      create: { id: `seed-label-${l.name.toLowerCase()}`, ...l },
    });
    labels[l.name] = created.id;
  }
  console.log('  ✅ Labels created');

  // ── 6. Tasks (Rich Data Generation) ──────────────────────
  const now = new Date();
  
  // Tasks for Platform V2
  const v2Tasks = [
    { n: 1, title: 'Database migration strategy', status: TaskStatus.DONE, pri: TaskPriority.HIGH, u: bob.id, daysOffset: -5, doneOffset: -2 },
    { n: 2, title: 'API Gateway implementation', status: TaskStatus.IN_REVIEW, pri: TaskPriority.HIGH, u: bob.id, daysOffset: -1 },
    { n: 3, title: 'Design new dashboard layout', status: TaskStatus.DONE, pri: TaskPriority.MEDIUM, u: alice.id, daysOffset: -10, doneOffset: -5 },
    { n: 4, title: 'Implement dark mode toggle', status: TaskStatus.IN_PROGRESS, pri: TaskPriority.MEDIUM, u: admin.id, daysOffset: 1 },
    { n: 5, title: 'Fix WebSocket disconnect issue', status: TaskStatus.TODO, pri: TaskPriority.URGENT, u: bob.id, daysOffset: 0 },
    { n: 6, title: 'Write unit tests for Auth', status: TaskStatus.BACKLOG, pri: TaskPriority.LOW, u: admin.id, daysOffset: 5 },
    { n: 7, title: 'Review V2 wireframes', status: TaskStatus.DONE, pri: TaskPriority.HIGH, u: admin.id, daysOffset: -15, doneOffset: -14 },
    { n: 8, title: 'Setup staging environment', status: TaskStatus.DONE, pri: TaskPriority.HIGH, u: admin.id, daysOffset: -3, doneOffset: -1 },
    { n: 9, title: 'Audit npm dependencies', status: TaskStatus.IN_PROGRESS, pri: TaskPriority.LOW, u: admin.id, daysOffset: 2 },
  ];

  // Tasks for Mobile Beta
  const mobTasks = [
    { n: 1, title: 'iOS TestFlight submission', status: TaskStatus.IN_PROGRESS, pri: TaskPriority.URGENT, u: admin.id, daysOffset: 2 },
    { n: 2, title: 'Android push notifications', status: TaskStatus.TODO, pri: TaskPriority.HIGH, u: bob.id, daysOffset: 4 },
    { n: 3, title: 'App icon refinement', status: TaskStatus.IN_REVIEW, pri: TaskPriority.MEDIUM, u: alice.id, daysOffset: 1 },
    { n: 4, title: 'Offline mode sync logic', status: TaskStatus.BACKLOG, pri: TaskPriority.HIGH, u: admin.id, daysOffset: 10 },
    { n: 5, title: 'Beta user feedback survey', status: TaskStatus.TODO, pri: TaskPriority.LOW, u: charlie.id, daysOffset: 7 },
  ];

  // Tasks for Q3 Marketing
  const q3Tasks = [
    { n: 1, title: 'Write launch blog post', status: TaskStatus.IN_PROGRESS, pri: TaskPriority.MEDIUM, u: charlie.id, daysOffset: 3 },
    { n: 2, title: 'Create social media assets', status: TaskStatus.TODO, pri: TaskPriority.HIGH, u: alice.id, daysOffset: 2 },
    { n: 3, title: 'Setup email drip campaign', status: TaskStatus.BACKLOG, pri: TaskPriority.MEDIUM, u: admin.id, daysOffset: 8 },
    { n: 4, title: 'Finalize press release', status: TaskStatus.IN_REVIEW, pri: TaskPriority.URGENT, u: charlie.id, daysOffset: 0 },
    { n: 5, title: 'Review competitor ads', status: TaskStatus.DONE, pri: TaskPriority.LOW, u: charlie.id, daysOffset: -7, doneOffset: -6 },
    { n: 6, title: 'Record demo video', status: TaskStatus.TODO, pri: TaskPriority.HIGH, u: admin.id, daysOffset: 4 },
  ];

  const allTaskDefs = [
    { proj: projects[0], tasks: v2Tasks },
    { proj: projects[1], tasks: mobTasks },
    { proj: projects[2], tasks: q3Tasks },
  ];

  let taskCount = 0;
  for (const group of allTaskDefs) {
    if (!group.proj) continue;
    for (const t of group.tasks) {
      const dueDate = new Date(now);
      dueDate.setDate(dueDate.getDate() + t.daysOffset);
      
      let completedAt = null;
      if (t.status === TaskStatus.DONE && t.doneOffset) {
        completedAt = new Date(now);
        completedAt.setDate(completedAt.getDate() + t.doneOffset);
      } else if (t.status === TaskStatus.DONE) {
        completedAt = new Date();
      }

      await prisma.task.upsert({
        where: { projectId_number: { projectId: group.proj.id, number: t.n } },
        update: {
          title: t.title,
          status: t.status,
          priority: t.pri,
          assigneeId: t.u,
          dueDate,
          completedAt
        },
        create: {
          projectId: group.proj.id,
          number: t.n,
          title: t.title,
          status: t.status,
          priority: t.pri,
          creatorId: admin.id,
          assigneeId: t.u,
          position: t.n * 1000,
          dueDate,
          completedAt,
          createdAt: new Date(Date.now() - Math.random() * 1000000000) // Random past creation date
        }
      });
      taskCount++;
    }
  }
  console.log(`  ✅ Tasks created (${taskCount} tasks)`);

  // ── 7. Fake Activity Feed ────────────────────────────────
  // We'll create some recent activities for the admin so the dashboard feed looks alive.
  await prisma.activity.deleteMany({ where: { userId: admin.id } }); // Clear old fake activities to avoid huge dupes
  
  const activities = [
    { type: ActivityType.TASK_ASSIGNED, meta: { title: 'Implement dark mode toggle', projectName: 'Platform V2 Release' }, teamId: coreTeam.id },
    { type: ActivityType.TASK_STATUS_CHANGED, meta: { title: 'Setup staging environment', projectName: 'Platform V2 Release' }, teamId: coreTeam.id },
    { type: ActivityType.PROJECT_CREATED, meta: { title: 'Mobile App Beta', projectName: 'Mobile App Beta' }, teamId: coreTeam.id },
    { type: ActivityType.TASK_COMMENTED, meta: { title: 'Write launch blog post', projectName: 'Q3 Marketing Push' }, teamId: growthTeam.id },
    { type: ActivityType.TASK_CREATED, meta: { title: 'Record demo video', projectName: 'Q3 Marketing Push' }, teamId: growthTeam.id },
  ];

  for (let i = 0; i < activities.length; i++) {
    const act = activities[i];
    await prisma.activity.create({
      data: {
        userId: admin.id,
        type: act.type,
        entityType: 'Task',
        entityId: `fake-id-${i}`,
        metadata: act.meta,
        teamId: act.teamId,
        createdAt: new Date(Date.now() - (i * 3600000)) // 1 hour apart
      }
    });
  }
  console.log('  ✅ Activity feed populated');

  console.log('\n🎉 Professional demo seed complete!\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
