const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clean existing data
  await prisma.notification.deleteMany();
  await prisma.forecastSnapshot.deleteMany();
  await prisma.recommendation.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.budget.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.income.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  // Create demo users
  const passwordHash = await bcrypt.hash('password123', 10);

  const alice = await prisma.user.create({
    data: {
      name: 'Alice Johnson',
      email: 'alice@university.edu',
      passwordHash,
      allowanceCycle: 'MONTHLY',
    },
  });

  const bob = await prisma.user.create({
    data: {
      name: 'Bob Smith',
      email: 'bob@university.edu',
      passwordHash,
      allowanceCycle: 'BIWEEKLY',
    },
  });

  console.log(`Created users: ${alice.name}, ${bob.name}`);

  // Create incomes for Alice
  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  await prisma.income.createMany({
    data: [
      {
        userId: alice.id,
        amount: 15000,
        source: 'Monthly Allowance',
        date: thisMonth,
        notes: 'From parents',
      },
      {
        userId: alice.id,
        amount: 3000,
        source: 'Part-time Tutoring',
        date: new Date(now.getFullYear(), now.getMonth(), 10),
        notes: 'Math tutoring sessions',
      },
      {
        userId: bob.id,
        amount: 12000,
        source: 'Bi-weekly Allowance',
        date: thisMonth,
      },
      {
        userId: bob.id,
        amount: 5000,
        source: 'Freelance Design',
        date: new Date(now.getFullYear(), now.getMonth(), 15),
      },
    ],
  });

  console.log('Created income records');

  // Create expenses for Alice (varied categories and dates)
  const aliceExpenses = [
    { amount: 250, category: 'FOOD', date: new Date(now.getFullYear(), now.getMonth(), 2), notes: 'Groceries' },
    { amount: 180, category: 'FOOD', date: new Date(now.getFullYear(), now.getMonth(), 4), notes: 'Campus cafeteria' },
    { amount: 500, category: 'FOOD', date: new Date(now.getFullYear(), now.getMonth(), 7), notes: 'Weekly groceries' },
    { amount: 120, category: 'TRANSPORT', date: new Date(now.getFullYear(), now.getMonth(), 2), notes: 'Bus pass top-up' },
    { amount: 350, category: 'TRANSPORT', date: new Date(now.getFullYear(), now.getMonth(), 9), notes: 'Uber rides' },
    { amount: 800, category: 'ENTERTAINMENT', date: new Date(now.getFullYear(), now.getMonth(), 5), notes: 'Movie night with friends' },
    { amount: 1500, category: 'SHOPPING', date: new Date(now.getFullYear(), now.getMonth(), 8), notes: 'New headphones', isImpulse: true },
    { amount: 200, category: 'EDUCATION', date: new Date(now.getFullYear(), now.getMonth(), 3), notes: 'Study materials' },
    { amount: 450, category: 'HEALTH', date: new Date(now.getFullYear(), now.getMonth(), 6), notes: 'Pharmacy' },
    { amount: 150, category: 'PERSONAL', date: new Date(now.getFullYear(), now.getMonth(), 10), notes: 'Haircut' },
    { amount: 2000, category: 'RENT', date: new Date(now.getFullYear(), now.getMonth(), 1), notes: 'Room share' },
    { amount: 300, category: 'UTILITIES', date: new Date(now.getFullYear(), now.getMonth(), 1), notes: 'Phone plan' },
  ];

  for (const exp of aliceExpenses) {
    await prisma.expense.create({
      data: {
        userId: alice.id,
        amount: exp.amount,
        category: exp.category,
        date: exp.date,
        notes: exp.notes,
        isImpulse: exp.isImpulse || false,
      },
    });
  }

  // Create expenses for Bob
  const bobExpenses = [
    { amount: 600, category: 'FOOD', date: new Date(now.getFullYear(), now.getMonth(), 1), notes: 'Meal plan' },
    { amount: 1200, category: 'ENTERTAINMENT', date: new Date(now.getFullYear(), now.getMonth(), 3), notes: 'Gaming subscription + purchases', isImpulse: true },
    { amount: 400, category: 'TRANSPORT', date: new Date(now.getFullYear(), now.getMonth(), 5), notes: 'Weekly transport' },
    { amount: 3000, category: 'RENT', date: new Date(now.getFullYear(), now.getMonth(), 1), notes: 'Dorm fees' },
    { amount: 500, category: 'SHOPPING', date: new Date(now.getFullYear(), now.getMonth(), 7), notes: 'Clothes' },
    { amount: 200, category: 'EDUCATION', date: new Date(now.getFullYear(), now.getMonth(), 4), notes: 'Online course' },
  ];

  for (const exp of bobExpenses) {
    await prisma.expense.create({
      data: {
        userId: bob.id,
        amount: exp.amount,
        category: exp.category,
        date: exp.date,
        notes: exp.notes,
        isImpulse: exp.isImpulse || false,
      },
    });
  }

  console.log('Created expense records');

  // Create budgets
  await prisma.budget.createMany({
    data: [
      { userId: alice.id, category: 'FOOD', limit: 3000, period: 'MONTHLY', startDate: thisMonth },
      { userId: alice.id, category: 'TRANSPORT', limit: 1000, period: 'MONTHLY', startDate: thisMonth },
      { userId: alice.id, category: 'ENTERTAINMENT', limit: 1500, period: 'MONTHLY', startDate: thisMonth },
      { userId: alice.id, category: 'SHOPPING', limit: 2000, period: 'MONTHLY', startDate: thisMonth },
      { userId: bob.id, category: 'FOOD', limit: 2500, period: 'MONTHLY', startDate: thisMonth },
      { userId: bob.id, category: 'ENTERTAINMENT', limit: 1000, period: 'MONTHLY', startDate: thisMonth },
    ],
  });

  console.log('Created budget records');

  // Create alerts
  await prisma.alert.createMany({
    data: [
      {
        userId: alice.id,
        type: 'IMPULSE',
        message: 'Impulse purchase detected: New headphones ($1500). Consider waiting 24 hours before large purchases.',
      },
      {
        userId: bob.id,
        type: 'OVERSPENDING',
        message: 'Entertainment spending has exceeded your monthly budget by 20%.',
      },
      {
        userId: bob.id,
        type: 'IMPULSE',
        message: 'Impulse purchase detected: Gaming subscription + purchases ($1200).',
        isRead: true,
      },
    ],
  });

  console.log('Created alert records');

  // Create recommendations
  await prisma.recommendation.createMany({
    data: [
      { userId: alice.id, tip: 'Consider meal prepping to cut food costs by up to 30%.', category: 'FOOD' },
      { userId: alice.id, tip: 'Try a 24-hour purchase delay rule for non-essential items.', category: null },
      { userId: bob.id, tip: 'Look for free campus events to cut entertainment spending.', category: 'ENTERTAINMENT' },
      { userId: bob.id, tip: 'Aim to save at least 10% of your allowance each cycle.', category: null },
    ],
  });

  console.log('Created recommendation records');

  // Create forecast snapshots
  await prisma.forecastSnapshot.createMany({
    data: [
      {
        userId: alice.id,
        balance: 11200,
        burnRate: 620,
        estimatedDaysLeft: 18,
        riskLevel: 'WARNING',
      },
      {
        userId: bob.id,
        balance: 7100,
        burnRate: 850,
        estimatedDaysLeft: 8,
        riskLevel: 'DANGER',
      },
    ],
  });

  console.log('Created forecast snapshots');

  // Create notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: alice.id,
        title: 'Budget Alert',
        body: 'You have used 70% of your food budget for this month.',
      },
      {
        userId: alice.id,
        title: 'Weekly Digest',
        body: 'Last week you spent $3,200. Your top category was Shopping.',
        isRead: true,
      },
      {
        userId: bob.id,
        title: 'Danger Zone',
        body: 'At your current spending rate, your balance will last only 8 more days.',
      },
    ],
  });

  console.log('Created notification records');
  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
