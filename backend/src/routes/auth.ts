import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../db";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

router.post("/register", async (req, res, next) => {
  try {
    const { email, password, name, organizationName } = req.body;
    if (!email || !password || !name || !organizationName) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const organization = await prisma.organization.upsert({
      where: { name: organizationName },
      update: {},
      create: { name: organizationName },
    });

    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        organizationId: organization.id,
      },
    });

    const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, {
      expiresIn: "8h",
    });

    res.json({ token });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Missing email or password" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, {
      expiresIn: "8h",
    });

    res.json({ token });
  } catch (error) {
    next(error);
  }
});

export default router;
