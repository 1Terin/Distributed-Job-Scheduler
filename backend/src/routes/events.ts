import express from "express";
import prisma from "../db";
import { broadcast } from "../utils/broadcast";
import { AuthRequest } from "../middleware/auth";
import { allowRoles } from "../middleware/rbac";
import { assertQueueAccess, handleAccessError } from "../utils/orgAccess";
import { incrementQueueStat } from "../utils/jobStats";

const router = express.Router();

router.post("/subscribe", allowRoles("ADMIN"), async (req: AuthRequest, res, next) => {
  try {
    const { queueId, eventType } = req.body;
    if (!queueId || !eventType) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    await assertQueueAccess(queueId, req.user!.organizationId);

    const subscription = await prisma.eventSubscription.upsert({
      where: { queueId_eventType: { queueId, eventType } },
      update: {},
      create: { queueId, eventType },
    });

    res.status(201).json(subscription);
  } catch (error) {
    const handled = handleAccessError(error, res);
    if (handled) return handled;
    next(error);
  }
});

router.post("/publish", allowRoles("ADMIN", "USER"), async (req: AuthRequest, res, next) => {
  try {
    const { eventType, payload } = req.body;
    if (!eventType || !payload) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const event = await prisma.event.create({
      data: {
        type: eventType,
        payload: JSON.stringify(payload),
      },
    });

    const subscriptions = await prisma.eventSubscription.findMany({ where: { eventType } });
    const createdJobs = [];

    for (const subscription of subscriptions) {
      const queue = await prisma.queue.findFirst({
        where: {
          id: subscription.queueId,
          project: { organizationId: req.user!.organizationId },
        },
      });
      if (!queue) continue;

      const job = await prisma.job.create({
        data: {
          queueId: subscription.queueId,
          projectId: queue.projectId,
          type: "IMMEDIATE",
          payload: JSON.stringify({ eventType, payload }),
          status: "QUEUED",
          priority: 0,
          maxAttempts: 3,
          availableAt: new Date(),
        },
      });
      await incrementQueueStat(subscription.queueId, "totalQueued");
      createdJobs.push(job);
    }

    await prisma.event.update({
      where: { id: event.id },
      data: { processedAt: new Date() },
    });

    broadcast({ type: "event_published", eventType, payload, jobsCreated: createdJobs.length });
    res.status(201).json({ event, jobsCreated: createdJobs.length });
  } catch (error) {
    next(error);
  }
});

export default router;
