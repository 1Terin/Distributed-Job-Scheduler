import express from "express";
import cors from "cors";
import morgan from "morgan";
import authRoutes from "./routes/auth";
import projectRoutes from "./routes/projects";
import queueRoutes from "./routes/queues";
import jobRoutes from "./routes/jobs";
import eventRoutes from "./routes/events";
import workerRoutes from "./routes/workers";
import retryPolicyRoutes from "./routes/retryPolicies";
import metricsRoutes from "./routes/metrics";
import { errorHandler } from "./middleware/errorHandler";
import { authenticate } from "./middleware/auth";

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("tiny"));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/projects", authenticate, projectRoutes);
app.use("/api/queues", authenticate, queueRoutes);
app.use("/api/jobs", authenticate, jobRoutes);
app.use("/api/events", authenticate, eventRoutes);
app.use("/api/workers", authenticate, workerRoutes);
app.use("/api/retry-policies", authenticate, retryPolicyRoutes);
app.use("/api/metrics", authenticate, metricsRoutes);

app.use(errorHandler);

export default app;
