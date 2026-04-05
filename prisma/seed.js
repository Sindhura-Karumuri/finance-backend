const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Generate a date N months ago from today
const monthsAgo = (n, day = 5) => {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  d.setDate(day);
  return d;
};

// Generate a date N weeks ago
const weeksAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n * 7);
  return d;
};

async function main() {
  // Clear existing data to avoid duplicates on re-seed
  await prisma.auditLog.deleteMany();
  await prisma.financialRecord.deleteMany();
  await prisma.user.deleteMany();

  const password = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.create({
    data: { name: 'Admin User', email: 'admin@finance.com', password, role: 'ADMIN' },
  });
  const analyst = await prisma.user.create({
    data: { name: 'Analyst User', email: 'analyst@finance.com', password, role: 'ANALYST' },
  });
  await prisma.user.create({
    data: { name: 'Viewer User', email: 'viewer@finance.com', password, role: 'VIEWER' },
  });

  // Records spread across last 6 months so trends endpoints return real data
  const records = [
    { amount: 5000, type: 'INCOME',  category: 'Salary',     date: monthsAgo(5, 5),  notes: 'Month -5 salary',    createdById: admin.id },
    { amount: 1200, type: 'EXPENSE', category: 'Rent',        date: monthsAgo(5, 10), notes: 'Monthly rent',       createdById: admin.id },
    { amount: 800,  type: 'INCOME',  category: 'Freelance',   date: monthsAgo(4, 3),  notes: 'Web project',        createdById: admin.id },
    { amount: 300,  type: 'EXPENSE', category: 'Utilities',   date: monthsAgo(4, 15), notes: 'Electricity bill',   createdById: admin.id },
    { amount: 5000, type: 'INCOME',  category: 'Salary',      date: monthsAgo(3, 5),  notes: 'Month -3 salary',    createdById: admin.id },
    { amount: 1200, type: 'EXPENSE', category: 'Rent',        date: monthsAgo(3, 10), notes: 'Monthly rent',       createdById: admin.id },
    { amount: 150,  type: 'EXPENSE', category: 'Groceries',   date: monthsAgo(2, 8),  notes: null,                 createdById: admin.id },
    { amount: 5000, type: 'INCOME',  category: 'Salary',      date: monthsAgo(2, 5),  notes: 'Month -2 salary',    createdById: admin.id },
    { amount: 200,  type: 'EXPENSE', category: 'Transport',   date: monthsAgo(1, 20), notes: null,                 createdById: analyst.id },
    { amount: 1200, type: 'EXPENSE', category: 'Rent',        date: monthsAgo(1, 10), notes: 'Monthly rent',       createdById: admin.id },
    { amount: 5000, type: 'INCOME',  category: 'Salary',      date: monthsAgo(1, 5),  notes: 'Last month salary',  createdById: admin.id },
    { amount: 600,  type: 'INCOME',  category: 'Freelance',   date: weeksAgo(3),      notes: 'Recent project',     createdById: admin.id },
    { amount: 90,   type: 'EXPENSE', category: 'Groceries',   date: weeksAgo(2),      notes: null,                 createdById: admin.id },
    { amount: 5000, type: 'INCOME',  category: 'Salary',      date: weeksAgo(1),      notes: 'This month salary',  createdById: admin.id },
    { amount: 1200, type: 'EXPENSE', category: 'Rent',        date: weeksAgo(1),      notes: 'Monthly rent',       createdById: admin.id },
  ];

  for (const r of records) {
    await prisma.financialRecord.create({ data: r });
  }

  console.log('Seed complete.');
  console.log('  admin@finance.com    / password123  (ADMIN)');
  console.log('  analyst@finance.com  / password123  (ANALYST)');
  console.log('  viewer@finance.com   / password123  (VIEWER)');
  console.log(`  ${records.length} financial records created across last 6 months`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
