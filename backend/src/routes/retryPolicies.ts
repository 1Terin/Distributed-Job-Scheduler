import express from "express";
import prisma from "../db";
import { AuthRequest } from "../middleware/auth";
import { allowRoles } from "../middleware/rbac";

const router = express.Router();

router.get("/", async (_req: AuthRequest, res, next) => {
  try {
    const policies = await prisma.retryPolicy.findMany({ orderBy: { createdAt: "desc" } });
    res.json(policies);
  } catch (error) {
    next(error);
  }
});

router.post("/", allowRoles("ADMIN"), async (req: AuthRequest, res, next) => {
  try {
    const { name, strategy, maxAttempts, delaySeconds } = req.body;
    if (!name || !strategy) {
      return res.status(400).json({ error: "name and strategy are required" });
    }
    if (!["FIXED", "LINEAR", "EXPONENTIAL"].includes(strategy)) {
      return res.status(400).json({ error: "strategy must be FIXED, LINEAR, or EXPONENTIAL" });
    }

    const policy = await prisma.retryPolicy.create({
      data: {
        name,
        strategy,
        maxAttempts: maxAttempts ?? 3,
        delaySeconds: delaySeconds ?? 30,
      },
    });
    res.status(201).json(policy);
  } catch (error) {
    next(error);
  }
});

export default router;
