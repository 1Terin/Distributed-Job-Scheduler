import express from "express";
import prisma from "../db";
import { AuthRequest } from "../middleware/auth";
import { allowRoles } from "../middleware/rbac";

const router = express.Router();

router.post("/", allowRoles("ADMIN", "USER"), async (req: AuthRequest, res, next) => {
  try {
    const { projectId, name, priority, concurrency, retryPolicyId, rateLimitPerMinute, shardKey } = req.body;
    if (!projectId || !name || !retryPolicyId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

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
    });

    res.json(queue);
  } catch (error) {
    next(error);
  }
});

router.get("/", async (req: AuthRequest, res, next) => {
  try {
    const { projectId } = req.query;
    const where = projectId ? { projectId: String(projectId) } : {};
    const queues = await prisma.queue.findMany({
      where,
      include: { statistics: true, retryPolicy: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(queues);
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", allowRoles("ADMIN"), async (req: AuthRequest, res, next) => {
  try {
    const updates = req.body;
    const queue = await prisma.queue.update({
      where: { id: req.params.id },
      data: updates,
    });
    res.json(queue);
  } catch (error) {
    next(error);
  }
});

router.post("/:id/pause", allowRoles("ADMIN"), async (req: AuthRequest, res, next) => {
  try {
    const queue = await prisma.queue.update({
      where: { id: req.params.id },
      data: { paused: true },
    });
    res.json(queue);
  } catch (error) {
    next(error);
  }
});

router.post("/:id/resume", allowRoles("ADMIN"), async (req: AuthRequest, res, next) => {
  try {
    const queue = await prisma.queue.update({
      where: { id: req.params.id },
      data: { paused: false },
    });
    res.json(queue);
  } catch (error) {
    next(error);
  }
});

export default router;
