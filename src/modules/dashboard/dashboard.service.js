const prisma = require('../../config/prisma');

/**
 * Total income, expenses, net balance.
 * Optionally scoped to a date range (from, to).
 */
const getSummary = async ({ from, to } = {}) => {
  const where = { isDeleted: false };
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = new Date(from);
    if (to)   where.date.lte = new Date(to);
  }

  const result = await prisma.financialRecord.groupBy({
    by: ['type'],
    where,
    _sum: { amount: true },
  });

  const totals = { INCOME: 0, EXPENSE: 0 };
  result.forEach((r) => { totals[r.type] = Number(r._sum.amount ?? 0); });

  return {
    totalIncome:   totals.INCOME,
    totalExpenses: totals.EXPENSE,
    netBalance:    totals.INCOME - totals.EXPENSE,
    ...(from || to ? { period: { from: from ?? null, to: to ?? null } } : {}),
  };
};

/**
 * Totals grouped by category and type.
 */
const getCategoryBreakdown = async () => {
  const result = await prisma.financialRecord.groupBy({
    by: ['category', 'type'],
    where: { isDeleted: false },
    _sum: { amount: true },
    orderBy: { _sum: { amount: 'desc' } },
  });

  return result.map((r) => ({
    category: r.category,
    type:     r.type,
    total:    Number(r._sum.amount ?? 0),
  }));
};

/**
 * Monthly trends for the last N months.
 */
const getMonthlyTrends = async (months = 6) => {
  const since = new Date();
  since.setDate(1); // anchor to 1st to avoid month-overflow edge cases
  since.setMonth(since.getMonth() - Number(months));

  const records = await prisma.financialRecord.findMany({
    where: { isDeleted: false, date: { gte: since } },
    select: { amount: true, type: true, date: true },
    orderBy: { date: 'asc' },
  });

  const map = {};
  records.forEach(({ amount, type, date }) => {
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!map[key]) map[key] = { period: key, income: 0, expenses: 0 };
    if (type === 'INCOME') map[key].income   += Number(amount);
    else                   map[key].expenses += Number(amount);
  });

  return Object.values(map).map((m) => ({ ...m, net: m.income - m.expenses }));
};

/**
 * Weekly trends for the last N weeks.
 * Groups records into ISO week buckets (YYYY-Www).
 */
const getWeeklyTrends = async (weeks = 8) => {
  const since = new Date();
  since.setDate(since.getDate() - weeks * 7);

  const records = await prisma.financialRecord.findMany({
    where: { isDeleted: false, date: { gte: since } },
    select: { amount: true, type: true, date: true },
    orderBy: { date: 'asc' },
  });

  const getISOWeek = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7)); // nearest Thursday
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
    return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
  };

  const map = {};
  records.forEach(({ amount, type, date }) => {
    const key = getISOWeek(date);
    if (!map[key]) map[key] = { period: key, income: 0, expenses: 0 };
    if (type === 'INCOME') map[key].income   += Number(amount);
    else                   map[key].expenses += Number(amount);
  });

  return Object.values(map).map((m) => ({ ...m, net: m.income - m.expenses }));
};

/**
 * N most recent records.
 */
const getRecentActivity = (limit = 10) =>
  prisma.financialRecord.findMany({
    where: { isDeleted: false },
    orderBy: { date: 'desc' },
    take: limit,
    select: {
      id: true, amount: true, type: true, category: true, date: true, notes: true,
      createdBy: { select: { name: true } },
    },
  });

module.exports = {
  getSummary,
  getCategoryBreakdown,
  getMonthlyTrends,
  getWeeklyTrends,
  getRecentActivity,
};
