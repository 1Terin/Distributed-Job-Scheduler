import prisma from "../db";

export async function getOrgProjectIds(organizationId: string): Promise<string[]> {
  const projects = await prisma.project.findMany({
    where: { organizationId },
    select: { id: true },
  });
  return projects.map((p) => p.id);
}

export async function getOrgQueueIds(organizationId: string): Promise<string[]> {
  const projectIds = await getOrgProjectIds(organizationId);
  if (projectIds.length === 0) return [];
  const queues = await prisma.queue.findMany({
    where: { projectId: { in: projectIds } },
    select: { id: true },
  });
  return queues.map((q) => q.id);
}

export async function assertProjectAccess(projectId: string, organizationId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId },
  });
  if (!project) throw new Error("PROJECT_NOT_FOUND");
  return project;
}

export async function assertQueueAccess(queueId: string, organizationId: string) {
  const queue = await prisma.queue.findFirst({
    where: {
      id: queueId,
      project: { organizationId },
    },
    include: { project: true, retryPolicy: true },
  });
  if (!queue) throw new Error("QUEUE_NOT_FOUND");
  return queue;
}

export async function assertJobAccess(jobId: string, organizationId: string) {
  const job = await prisma.job.findFirst({
    where: {
      id: jobId,
      project: { organizationId },
    },
  });
  if (!job) throw new Error("JOB_NOT_FOUND");
  return job;
}

export function handleAccessError(error: unknown, res: any) {
  if (error instanceof Error) {
    if (error.message === "PROJECT_NOT_FOUND") return res.status(404).json({ error: "Project not found" });
    if (error.message === "QUEUE_NOT_FOUND") return res.status(404).json({ error: "Queue not found" });
    if (error.message === "JOB_NOT_FOUND") return res.status(404).json({ error: "Job not found" });
  }
  return null;
}
