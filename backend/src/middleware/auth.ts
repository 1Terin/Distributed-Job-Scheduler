import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import prisma from "../db";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

export interface AuthRequest extends Request {
  user?: { id: string; email: string; role: string; organizationId: string };
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string; email: string; role: string };
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      return res.status(401).json({ error: "Invalid token" });
    }

    req.user = { id: user.id, email: user.email, role: user.role, organizationId: user.organizationId };
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
}
