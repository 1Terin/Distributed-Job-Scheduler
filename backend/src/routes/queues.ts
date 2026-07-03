import express from "express";
import prisma from "../db";
import { AuthRequest } from "../middleware/auth";
import { allowRoles } from "../middleware/rbac";
import { assertProjectAccess, assertQueueAccess, getOrgProjectIds, handleAccessError } from "../utils/orgAccess";

const router = express.Router();

const PATCHABLE_FIELDS = ["name", "priority", "concurrency", "retryPolicyId", "rateLimitPerMinute", "shardKey"] as const;

router.post("/", allowRoles("ADMIN", "USER"), async (req: AuthRequest, res, next) => {
  try {
    const { projectId, name, priority, concurrency, retryPolicyId, rateLimitPerMinute, shardKey } = req.body;
    if (!projectId || !name || !retryPolicyId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    await assertProjectAccess(projectId, req.user!.organizationId);

    const queue = await prisma.queue.create({
      data: {
        name,
        priority: priority ?? 0,
        concurrency: concurrency ?? 5,
        projectId,
        retryPolicyId,
        rateLimitPerMinute: rateLimitPerMinute ?? 0,
        shardKey: shardKey ?? null,
      },
      include: { retryPolicy: true },
    });

    await prisma.queueStatistics.create({
      data: {
        queueId: queue.id,
        totalQueued: 0,
        totalCompleted: 0,
        totalFailed: 0,
        totalRetried: 0,
        totalDeadLetter: 0,
      },
    });

    res.status(201).json(queue);
  } catch (error) {
    const handled = handleAccessError(error, res);
    if (handled) return handled;
    next(error);
  }
});

router.get("/", async (req: AuthRequest, res, next) => {
  try {
    const { projectId } = req.query;
    const projectIds = await getOrgProjectIds(req.user!.organizationId);

    const where: any = { projectId: { in: projectIds } };
    if (projectId) {
      if (!projectIds.includes(String(projectId))) return res.status(404).json({ error: "Project not found" });
      where.projectId = String(projectId);
    }

    const queues = await prisma.queue.findMany({
      where,
      include: { statistics: true, retryPolicy: true, project: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(queues);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req: AuthRequest, res, next) => {
  try {
    const queue = await assertQueueAccess(req.params.id, req.user!.organizationId);
    const full = await prisma.queue.findUnique({
      where: { id: queue.id },
      include: { statistics: true, retryPolicy: true, project: true, eventSubscriptions: true },
    });
    res.json(full);
  } catch (error) {
    const handled = handleAccessError(error, res);
    if (handled) return handled;
    next(error);
  }
});

router.patch("/:id", allowRoles("ADMIN"), async (req: AuthRequest, res, next) => {
  try {
    await assertQueueAccess(req.params.id, req.user!.organizationId);
    const updates: Record<string, unknown> = {};
    for (const field of PATCHABLE_FIELDS) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    const queue = await prisma.queue.update({
      where: { id: req.params.id },
      data: updates,
      include: { statistics: true, retryPolicy: true },
    });
    res.json(queue);
  } catch (error) {
    const handled = handleAccessError(error, res);
    if (handled) return handled;
    next(error);
  }
});

router.post("/:id/pause", allowRoles("ADMIN"), async (req: AuthRequest, res, next) => {
  try {
    await assertQueueAccess(req.params.id, req.user!.organizationId);
    const queue = await prisma.queue.update({
      where: { id: req.params.id },
      data: { paused: true },
    });
    res.json(queue);
  } catch (error) {
    const handled = handleAccessError(error, res);
    if (handled) return handled;
    next(error);
  }
});

router.post("/:id/resume", allowRoles("ADMIN"), async (req: AuthRequest, res, next) => {
  try {
    await assertQueueAccess(req.params.id, req.user!.organizationId);
    const queue = await prisma.queue.update({
      where: { id: req.params.id },
      data: { paused: false },
    });
    res.json(queue);
  } catch (error) {
    const handled = handleAccessError(error, res);
    if (handled) return handled;
    next(error);
  }
});

export default router;
