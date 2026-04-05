const prisma = require('../../config/prisma');
const audit  = require('../audit/audit.service');

const buildFilters = ({ type, category, dateFrom, dateTo, viewerUserId }) => {
  const where = { isDeleted: false };
  if (viewerUserId) where.createdById = viewerUserId; // VIEWERs see only their own records
  if (type)     where.type     = type;
  if (category) where.category = { contains: category, mode: 'insensitive' };
  if (dateFrom || dateTo) {
    where.date = {};
    if (dateFrom) where.date.gte = new Date(dateFrom);
    if (dateTo)   where.date.lte = new Date(dateTo);
  }
  return where;
};

const listRecords = async ({ type, category, dateFrom, dateTo, page = 1, limit = 20 }, actor) => {
  const viewerUserId = actor.role === 'VIEWER' ? actor.id : undefined;
  const where = buildFilters({ type, category, dateFrom, dateTo, viewerUserId });
  const skip  = (Number(page) - 1) * Number(limit);

  const [records, total] = await Promise.all([
    prisma.financialRecord.findMany({
      where, skip, take: Number(limit),
      orderBy: { date: 'desc' },
      include: { createdBy: { select: { id: true, name: true } } },
    }),
    prisma.financialRecord.count({ where }),
  ]);

  return { records, total, page: Number(page), pages: Math.ceil(total / Number(limit)) };
};

const getRecord = (id) =>
  prisma.financialRecord.findFirstOrThrow({
    where: { id, isDeleted: false },
    include: { createdBy: { select: { id: true, name: true } } },
  });

const createRecord = async (data, actor) => {
  const record = await prisma.financialRecord.create({
    data: {
      amount:      data.amount,
      type:        data.type,
      category:    data.category,
      date:        new Date(data.date),
      notes:       data.notes ?? null,
      createdById: actor.id,
    },
  });

  await audit.writeLog('CREATE', record.id, actor, {
    after: { amount: data.amount, type: data.type, category: data.category, date: data.date },
  });

  return record;
};

const updateRecord = async (id, data, actor) => {
  const existing = await getRecord(id);

  const allowed = {};
  if (data.amount   !== undefined) allowed.amount   = data.amount;
  if (data.type     !== undefined) allowed.type     = data.type;
  if (data.category !== undefined) allowed.category = data.category;
  if (data.date     !== undefined) allowed.date     = new Date(data.date);
  if (data.notes    !== undefined) allowed.notes    = data.notes;

  const updated = await prisma.financialRecord.update({ where: { id }, data: allowed });

  // Capture only the fields that actually changed
  const before = {}, after = {};
  Object.keys(allowed).forEach((k) => { before[k] = existing[k]; after[k] = updated[k]; });
  await audit.writeLog('UPDATE', id, actor, { before, after });

  return updated;
};

const deleteRecord = async (id, actor) => {
  await getRecord(id);
  const deleted = await prisma.financialRecord.update({ where: { id }, data: { isDeleted: true } });
  await audit.writeLog('DELETE', id, actor, null);
  return deleted;
};

module.exports = { listRecords, getRecord, createRecord, updateRecord, deleteRecord };
