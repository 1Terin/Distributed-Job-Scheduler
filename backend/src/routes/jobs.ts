import express from "express";
import prisma from "../db";
import { AuthRequest } from "../middleware/auth";
import { broadcast } from "../utils/broadcast";

const router = express.Router();

router.post("/", async (req: AuthRequest, res, next) => {
  try {
    const { queueId, type, payload, priority, scheduledAt, maxAttempts, recurringCron, dependsOnIds } = req.body;
    if (!queueId || !type || !payload) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const queue = await prisma.queue.findUnique({ where: { id: queueId }, include: { project: true } });
    if (!queue) {
      return res.status(404).json({ error: "Queue not found" });
    }

    const now = new Date();
    const availableAt = type === "DELAYED" || type === "SCHEDULED" ? new Date(scheduledAt) : now;

    const job = await prisma.job.create({
      data: {
        queueId,
        projectId: queue.projectId,
        type,
        payload: JSON.stringify(payload),
        priority: priority ?? queue.priority,
        status: type === "SCHEDULED" ? "SCHEDULED" : "QUEUED",
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        availableAt,
        maxAttempts: maxAttempts ?? 3,
      },
    });

    if (Array.isArray(dependsOnIds) && dependsOnIds.length > 0) {
      await prisma.jobDependency.createMany({
        data: dependsOnIds.map((dependsOnId: string) => ({ jobId: job.id, dependsOnJobId: dependsOnId })),
      });
    }

    broadcast({ type: "job_created", jobId: job.id, status: job.status, queueId });
    res.status(201).json(job);
  } catch (error) {
    next(error);
  }
});

router.get("/", async (req: AuthRequest, res, next) => {
  try {
    const { queueId, status, page = "1", limit = "20" } = req.query;
    const where: any = {};
    if (queueId) where.queueId = String(queueId);
    if (status) where.status = String(status);

    const pageNum = Number(page);
    const limitNum = Number(limit);

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        orderBy: [{ priority: "desc" }, { availableAt: "asc" }, { createdAt: "desc" }],
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.job.count({ where }),
    ]);

    res.json({ items: jobs, total, page: pageNum, limit: limitNum });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/retry", async (req: AuthRequest, res, next) => {
  try {
    const job = await prisma.job.update({
      where: { id: req.params.id },
      data: {
        status: "QUEUED",
        attempt: 0,
        lastError: null,
        failureSummary: null,
        nextRetryAt: null,
        deadLetter: { delete: true },
      },
    });
    broadcast({ type: "job_retried", jobId: job.id, queueId: job.queueId });
    res.json(job);
  } catch (error) {
    next(error);
  }
});

router.post("/:id/cancel", async (req: AuthRequest, res, next) => {
  try {
    const job = await prisma.job.update({
      where: { id: req.params.id },
      data: { status: "FAILED", completedAt: new Date() },
    });
    broadcast({ type: "job_cancelled", jobId: job.id, queueId: job.queueId });
    res.json(job);
  } catch (error) {
    next(error);
  }
});

export default router;
