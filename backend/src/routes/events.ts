import express from "express";
import prisma from "../db";
import { broadcast } from "../utils/broadcast";
import { AuthRequest } from "../middleware/auth";
import { allowRoles } from "../middleware/rbac";

const router = express.Router();

router.post("/subscribe", allowRoles("ADMIN"), async (req: AuthRequest, res, next) => {
  try {
    const { queueId, eventType } = req.body;
    if (!queueId || !eventType) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const subscription = await prisma.eventSubscription.upsert({
      where: { queueId_eventType: { queueId, eventType } },
      update: {},
      create: { queueId, eventType },
    });

    res.status(201).json(subscription);
  } catch (error) {
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
    for (const subscription of subscriptions) {
      await prisma.job.create({
        data: {
          queueId: subscription.queueId,
          projectId: (await prisma.queue.findUnique({ where: { id: subscription.queueId } }))!.projectId,
          type: "IMMEDIATE",
          payload: JSON.stringify({ eventType, payload }),
          status: "QUEUED",
          priority: 0,
          maxAttempts: 3,
          availableAt: new Date(),
        },
      });
    }

    broadcast({ type: "event_published", eventType, payload });
    res.status(201).json(event);
  } catch (error) {
    next(error);
  }
});

export default router;
