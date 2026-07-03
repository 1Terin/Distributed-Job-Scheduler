import prisma from "../db";

export async function incrementQueueStat(queueId: string, field: "totalQueued" | "totalCompleted" | "totalFailed" | "totalRetried" | "totalDeadLetter") {
  await prisma.queueStatistics.upsert({
    where: { queueId },
    create: {
      queueId,
      totalQueued: field === "totalQueued" ? 1 : 0,
      totalCompleted: field === "totalCompleted" ? 1 : 0,
      totalFailed: field === "totalFailed" ? 1 : 0,
      totalRetried: field === "totalRetried" ? 1 : 0,
      totalDeadLetter: field === "totalDeadLetter" ? 1 : 0,
    },
    update: { [field]: { increment: 1 } },
  });
}
