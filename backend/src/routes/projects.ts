import express from "express";
import prisma from "../db";
import { AuthRequest } from "../middleware/auth";

const router = express.Router();

router.post("/", async (req: AuthRequest, res, next) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Project name is required" });
    }

    const project = await prisma.project.create({
      data: {
        name,
        description,
        organizationId: req.user!.organizationId,
      },
    });

    res.json(project);
  } catch (error) {
    next(error);
  }
});

router.get("/", async (req: AuthRequest, res, next) => {
  try {
    const projects = await prisma.project.findMany({
      where: { organizationId: req.user!.id },
      orderBy: { createdAt: "desc" },
    });
    res.json(projects);
  } catch (error) {
    next(error);
  }
});

export default router;
