import express from "express";
import prisma from "../db";
import { AuthRequest } from "../middleware/auth";

const router = express.Router();

router.get("/", async (req: AuthRequest, res, next) => {
  try {
    const workers = await prisma.worker.findMany({ orderBy: { lastSeenAt: "desc" } });
    res.json(workers);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req: AuthRequest, res, next) => {
  try {
    const worker = await prisma.worker.findUnique({ where: { id: req.params.id } });
    if (!worker) return res.status(404).json({ error: "Worker not found" });
    const heartbeats = await prisma.heartbeat.findMany({ where: { workerId: worker.id }, orderBy: { createdAt: "desc" }, take: 50 });
    res.json({ worker, heartbeats });
  } catch (error) {
    next(error);
  }
});

export default router;
