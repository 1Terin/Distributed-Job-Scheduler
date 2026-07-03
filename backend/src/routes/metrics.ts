import express from "express";
import prisma from "../db";
import { AuthRequest } from "../middleware/auth";
import { getOrgQueueIds } from "../utils/orgAccess";

const router = express.Router();

router.get("/", async (req: AuthRequest, res, next) => {
  try {
    const queueIds = await getOrgQueueIds(req.user!.organizationId);

    const [queues, workers, jobCounts, recentExecutions] = await Promise.all([
      prisma.queue.findMany({
        where: { id: { in: queueIds } },
        include: { statistics: true },
      }),
      prisma.worker.findMany({ orderBy: { lastSeenAt: "desc" } }),
      prisma.job.groupBy({
        by: ["status"],
        where: { queueId: { in: queueIds } },
        _count: { id: true },
      }),
      prisma.jobExecution.findMany({
        where: { job: { queueId: { in: queueIds } } },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: { status: true, durationMs: true, createdAt: true },
      }),
    ]);

    const statusCounts = Object.fromEntries(jobCounts.map((g) => [g.status, g._count.id]));
    const succeeded = recentExecutions.filter((e) => e.status === "SUCCEEDED");
    const avgDurationMs =
      succeeded.length > 0
        ? Math.round(succeeded.reduce((sum, e) => sum + (e.durationMs || 0), 0) / succeeded.length)
        : 0;

    const now = Date.now();
    const onlineWorkers = workers.filter((w) => now - new Date(w.lastSeenAt).getTime() < 30000).length;

    const throughput = recentExecutions.filter(
      (e) => e.status === "SUCCEEDED" && now - new Date(e.createdAt).getTime() < 3600000
    ).length;

    res.json({
      queues,
      workers: { total: workers.length, online: onlineWorkers },
      jobStatusCounts: statusCounts,
      avgDurationMs,
      throughputLastHour: throughput,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
