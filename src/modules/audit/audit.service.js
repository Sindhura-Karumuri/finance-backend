const prisma = require('../../config/prisma');

const writeLog = (action, recordId, actor, diff = null) =>
  prisma.auditLog.create({
    data: {
      action,
      recordId,
      actorId:    actor.id,
      actorEmail: actor.email,
      diff:       diff ? JSON.stringify(diff) : null,
    },
  });

const parseLogs = (logs) =>
  logs.map((l) => ({ ...l, diff: l.diff ? JSON.parse(l.diff) : null }));

const getLogsForRecord = async (recordId) => {
  const logs = await prisma.auditLog.findMany({
    where: { recordId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, action: true, actorEmail: true, diff: true, createdAt: true },
  });
  return parseLogs(logs);
};

const getRecentLogs = async (limit = 20) => {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: { id: true, action: true, recordId: true, actorEmail: true, diff: true, createdAt: true },
  });
  return parseLogs(logs);
};

module.exports = { writeLog, getLogsForRecord, getRecentLogs };
