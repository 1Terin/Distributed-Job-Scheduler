import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "./auth";

export function requireRole(role: string) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: "Forbidden" });
    }

    next();
  };
}

export function allowRoles(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    next();
  };
}
