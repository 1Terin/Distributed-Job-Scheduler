const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const organization = await prisma.organization.upsert({
    where: { name: "Acme Corp" },
    update: {},
    create: { name: "Acme Corp" },
  });

  const user = await prisma.user.upsert({
    where: { email: "admin@acme.local" },
    update: { role: "ADMIN" },
    create: {
      email: "admin@acme.local",
      name: "Admin User",
      passwordHash: await bcrypt.hash("Password123!", 10),
      organizationId: organization.id,
      role: "ADMIN",
    },
  });

  const project = await prisma.project.upsert({
    where: {
      organizationId_name: {
        organizationId: organization.id,
        name: "Alpha Project",
      },
    },
    update: {},
    create: {
      name: "Alpha Project",
      description: "Sample scheduling project",
      organizationId: organization.id,
    },
  });

  let retryPolicy = await prisma.retryPolicy.findFirst({
    where: { name: "Default Retry" },
  });
  if (!retryPolicy) {
    retryPolicy = await prisma.retryPolicy.create({
      data: {
        name: "Default Retry",
        strategy: "FIXED",
        maxAttempts: 3,
        delaySeconds: 15,
      },
    });
  }

  const queue = await prisma.queue.upsert({
    where: {
      projectId_name: {
        projectId: project.id,
        name: "default",
      },
    },
    update: {},
    create: {
      name: "default",
      projectId: project.id,
      priority: 1,
      concurrency: 5,
      retryPolicyId: retryPolicy.id,
    },
  });

  await prisma.queueStatistics.upsert({
    where: { queueId: queue.id },
    update: {},
    create: {
      queueId: queue.id,
      totalQueued: 0,
      totalCompleted: 0,
      totalFailed: 0,
      totalRetried: 0,
      totalDeadLetter: 0,
    },
  });

  await prisma.queueRateWindow.upsert({
    where: { queueId: queue.id },
    update: {},
    create: {
      queueId: queue.id,
      windowStart: new Date(new Date().setSeconds(0, 0)),
      count: 0,
    },
  });

  await prisma.queueStatistics.update({
    where: { queueId: queue.id },
    data: { totalQueued: 4 },
  });

  const immediateJob = await prisma.job.create({
    data: {
      queueId: queue.id,
      projectId: project.id,
      type: "IMMEDIATE",
      payload: JSON.stringify({ task: "send-email", recipient: "user@example.com" }),
      status: "QUEUED",
      priority: 10,
      maxAttempts: 3,
    },
  });

  const delayedJob = await prisma.job.create({
    data: {
      queueId: queue.id,
      projectId: project.id,
      type: "DELAYED",
      payload: JSON.stringify({ task: "generate-report" }),
      status: "QUEUED",
      priority: 5,
      maxAttempts: 2,
      scheduledAt: new Date(Date.now() + 1000 * 60 * 5),
      availableAt: new Date(Date.now() + 1000 * 60 * 5),
    },
  });

  const scheduledJob = await prisma.job.create({
    data: {
      queueId: queue.id,
      projectId: project.id,
      type: "SCHEDULED",
      payload: JSON.stringify({ task: "sync-data" }),
      status: "SCHEDULED",
      priority: 3,
      maxAttempts: 3,
      scheduledAt: new Date(Date.now() + 1000 * 60 * 10),
      availableAt: new Date(Date.now() + 1000 * 60 * 10),
    },
  });

  await prisma.job.create({
    data: {
      queueId: queue.id,
      projectId: project.id,
      type: "BATCH",
      payload: JSON.stringify({ task: "batch-process", items: [1, 2, 3] }),
      status: "QUEUED",
      priority: 4,
      maxAttempts: 3,
    },
  });

  await prisma.jobDependency.create({
    data: {
      jobId: delayedJob.id,
      dependsOnJobId: immediateJob.id,
    },
  });

  await prisma.eventSubscription.upsert({
    where: { queueId_eventType: { queueId: queue.id, eventType: "JOB_CREATED" } },
    update: {},
    create: {
      queueId: queue.id,
      eventType: "JOB_CREATED",
    },
  });

  const localWorker = await prisma.worker.findFirst({
    where: { name: "local-worker" },
  });
  if (localWorker) {
    await prisma.worker.update({
      where: { id: localWorker.id },
      data: { lastSeenAt: new Date() },
    });
  } else {
    await prisma.worker.create({
      data: {
        name: "local-worker",
        host: "localhost",
        version: "0.1.0",
      },
    });
  }

  console.log("Seed data created successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
