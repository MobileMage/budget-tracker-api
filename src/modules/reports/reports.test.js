const reportsService = require('./reports.service');
const prisma = require('../../config/database');

jest.mock('../../config/database', () => ({
  income: {
    findMany: jest.fn(),
    aggregate: jest.fn(),
  },
  expense: {
    findMany: jest.fn(),
    aggregate: jest.fn(),
  },
  budget: {
    findMany: jest.fn(),
  },
  alert: {
    findMany: jest.fn(),
  },
}));

const USER_ID = 'user-abc-123';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('reportsService.getMonthlyReport', () => {
  it('should return a complete monthly report structure', async () => {
    prisma.income.findMany.mockResolvedValue([
      { amount: 2000, source: 'Salary', date: new Date('2026-02-05') },
      { amount: 500, source: 'Freelance', date: new Date('2026-02-15') },
    ]);

    prisma.expense.findMany.mockResolvedValue([
      { amount: 100, category: 'FOOD', date: new Date('2026-02-03'), notes: null, isImpulse: false },
      { amount: 200, category: 'TRANSPORT', date: new Date('2026-02-03'), notes: null, isImpulse: false },
      { amount: 50, category: 'FOOD', date: new Date('2026-02-10'), notes: null, isImpulse: true },
    ]);

    prisma.budget.findMany.mockResolvedValue([
      { category: 'FOOD', limit: 300, period: 'MONTHLY' },
      { category: 'TRANSPORT', limit: 150, period: 'MONTHLY' },
    ]);

    prisma.alert.findMany.mockResolvedValue([
      { type: 'OVERSPENDING' },
      { type: 'OVERSPENDING' },
      { type: 'IMPULSE' },
    ]);

    prisma.income.aggregate.mockResolvedValue({ _sum: { amount: 2000 } });
    prisma.expense.aggregate.mockResolvedValue({ _sum: { amount: 300 } });

    const report = await reportsService.getMonthlyReport(USER_ID, 2026, 2);

    expect(report).toHaveProperty('period');
    expect(report.period).toHaveProperty('start');
    expect(report.period).toHaveProperty('end');

    expect(report).toHaveProperty('income');
    expect(report.income.total).toBe(2500);
    expect(report.income.sources).toHaveLength(2);

    expect(report).toHaveProperty('expenses');
    expect(report.expenses.total).toBe(350);
    expect(report.expenses.byCategory).toHaveLength(2);
    expect(report.expenses.dailyBreakdown).toHaveLength(2);

    expect(report).toHaveProperty('budgetCompliance');
    expect(report.budgetCompliance).toHaveLength(2);

    const foodCompliance = report.budgetCompliance.find((b) => b.category === 'FOOD');
    expect(foodCompliance.spent).toBe(150);
    expect(foodCompliance.status).toBe('under');

    const transportCompliance = report.budgetCompliance.find((b) => b.category === 'TRANSPORT');
    expect(transportCompliance.spent).toBe(200);
    expect(transportCompliance.status).toBe('over');

    expect(report).toHaveProperty('savings');
    expect(report.savings.amount).toBe(2150);

    expect(report).toHaveProperty('alerts');
    expect(report.alerts.total).toBe(3);
    expect(report.alerts.byType).toEqual(
      expect.arrayContaining([
        { type: 'OVERSPENDING', count: 2 },
        { type: 'IMPULSE', count: 1 },
      ])
    );

    expect(report).toHaveProperty('comparison');
    expect(report.comparison).toHaveProperty('previousMonth');
    expect(report.comparison).toHaveProperty('incomeChange');
    expect(report.comparison).toHaveProperty('expenseChange');
  });

  it('should handle a month with no income or expenses', async () => {
    prisma.income.findMany.mockResolvedValue([]);
    prisma.expense.findMany.mockResolvedValue([]);
    prisma.budget.findMany.mockResolvedValue([]);
    prisma.alert.findMany.mockResolvedValue([]);
    prisma.income.aggregate.mockResolvedValue({ _sum: { amount: null } });
    prisma.expense.aggregate.mockResolvedValue({ _sum: { amount: null } });

    const report = await reportsService.getMonthlyReport(USER_ID, 2026, 1);

    expect(report.income.total).toBe(0);
    expect(report.income.sources).toHaveLength(0);
    expect(report.expenses.total).toBe(0);
    expect(report.expenses.byCategory).toHaveLength(0);
    expect(report.expenses.dailyBreakdown).toHaveLength(0);
    expect(report.savings.amount).toBe(0);
    expect(report.savings.rate).toBe(0);
    expect(report.alerts.total).toBe(0);
  });

  it('should compute correct category percentages', async () => {
    prisma.income.findMany.mockResolvedValue([]);
    prisma.expense.findMany.mockResolvedValue([
      { amount: 75, category: 'FOOD', date: new Date('2026-03-01'), notes: null, isImpulse: false },
      { amount: 25, category: 'TRANSPORT', date: new Date('2026-03-02'), notes: null, isImpulse: false },
    ]);
    prisma.budget.findMany.mockResolvedValue([]);
    prisma.alert.findMany.mockResolvedValue([]);
    prisma.income.aggregate.mockResolvedValue({ _sum: { amount: null } });
    prisma.expense.aggregate.mockResolvedValue({ _sum: { amount: null } });

    const report = await reportsService.getMonthlyReport(USER_ID, 2026, 3);

    const food = report.expenses.byCategory.find((c) => c.category === 'FOOD');
    const transport = report.expenses.byCategory.find((c) => c.category === 'TRANSPORT');

    expect(food.percentage).toBe(75);
    expect(transport.percentage).toBe(25);
  });
});

describe('reportsService.getWeeklyReport', () => {
  it('should return a weekly summary with impulse spending and top 5', async () => {
    prisma.income.aggregate.mockResolvedValue({ _sum: { amount: 1000 } });

    prisma.expense.findMany.mockResolvedValue([
      { id: 'e1', amount: 500, category: 'RENT', date: new Date('2026-02-23'), notes: null, isImpulse: false },
      { id: 'e2', amount: 200, category: 'FOOD', date: new Date('2026-02-24'), notes: 'Groceries', isImpulse: false },
      { id: 'e3', amount: 30, category: 'SHOPPING', date: new Date('2026-02-24'), notes: null, isImpulse: true },
      { id: 'e4', amount: 15, category: 'ENTERTAINMENT', date: new Date('2026-02-25'), notes: null, isImpulse: true },
      { id: 'e5', amount: 80, category: 'TRANSPORT', date: new Date('2026-02-26'), notes: null, isImpulse: false },
      { id: 'e6', amount: 10, category: 'FOOD', date: new Date('2026-02-27'), notes: null, isImpulse: false },
    ]);

    const report = await reportsService.getWeeklyReport(USER_ID, new Date('2026-02-25'));

    expect(report).toHaveProperty('period');
    expect(report.totalIncome).toBe(1000);
    expect(report.totalExpenses).toBe(835);

    expect(report.byCategory.length).toBeGreaterThan(0);
    expect(report.dailyBreakdown.length).toBeGreaterThan(0);

    expect(report.top5Expenses).toHaveLength(5);
    expect(report.top5Expenses[0].amount).toBe(500);

    expect(report.impulseSpending.count).toBe(2);
    expect(report.impulseSpending.total).toBe(45);
  });

  it('should handle a week with no expenses', async () => {
    prisma.income.aggregate.mockResolvedValue({ _sum: { amount: 500 } });
    prisma.expense.findMany.mockResolvedValue([]);

    const report = await reportsService.getWeeklyReport(USER_ID, new Date('2026-02-23'));

    expect(report.totalIncome).toBe(500);
    expect(report.totalExpenses).toBe(0);
    expect(report.byCategory).toHaveLength(0);
    expect(report.dailyBreakdown).toHaveLength(0);
    expect(report.top5Expenses).toHaveLength(0);
    expect(report.impulseSpending.count).toBe(0);
    expect(report.impulseSpending.total).toBe(0);
  });

  it('should return fewer than 5 when there are less than 5 expenses', async () => {
    prisma.income.aggregate.mockResolvedValue({ _sum: { amount: null } });
    prisma.expense.findMany.mockResolvedValue([
      { id: 'e1', amount: 50, category: 'FOOD', date: new Date('2026-02-23'), notes: null, isImpulse: false },
      { id: 'e2', amount: 20, category: 'FOOD', date: new Date('2026-02-24'), notes: null, isImpulse: false },
    ]);

    const report = await reportsService.getWeeklyReport(USER_ID, new Date('2026-02-23'));

    expect(report.top5Expenses).toHaveLength(2);
  });
});

describe('reportsService.getCustomReport', () => {
  it('should generate a report for an arbitrary date range', async () => {
    prisma.income.findMany.mockResolvedValue([
      { amount: 1500, source: 'Contract', date: new Date('2026-01-15') },
    ]);

    prisma.expense.findMany.mockResolvedValue([
      { amount: 300, category: 'UTILITIES', date: new Date('2026-01-20'), notes: null, isImpulse: false },
      { amount: 100, category: 'FOOD', date: new Date('2026-02-05'), notes: null, isImpulse: false },
    ]);

    prisma.budget.findMany.mockResolvedValue([
      { category: 'FOOD', limit: 200 },
    ]);

    prisma.alert.findMany.mockResolvedValue([]);

    const report = await reportsService.getCustomReport(
      USER_ID,
      new Date('2026-01-01'),
      new Date('2026-02-28')
    );

    expect(report).toHaveProperty('period');
    expect(report.income.total).toBe(1500);
    expect(report.expenses.total).toBe(400);
    expect(report.expenses.byCategory).toHaveLength(2);
    expect(report.budgetCompliance).toHaveLength(1);
    expect(report.savings.amount).toBe(1100);
    expect(report.alerts.total).toBe(0);
  });

  it('should handle empty data in a custom range', async () => {
    prisma.income.findMany.mockResolvedValue([]);
    prisma.expense.findMany.mockResolvedValue([]);
    prisma.budget.findMany.mockResolvedValue([]);
    prisma.alert.findMany.mockResolvedValue([]);

    const report = await reportsService.getCustomReport(
      USER_ID,
      new Date('2026-06-01'),
      new Date('2026-06-30')
    );

    expect(report.income.total).toBe(0);
    expect(report.expenses.total).toBe(0);
    expect(report.savings.amount).toBe(0);
    expect(report.savings.rate).toBe(0);
  });
});

describe('reportsService.getExpenseExportData', () => {
  it('should return formatted expense rows for CSV export', async () => {
    prisma.expense.findMany.mockResolvedValue([
      {
        id: 'e1',
        amount: 45.99,
        category: 'FOOD',
        date: new Date('2026-02-10T12:00:00Z'),
        notes: 'Restaurant lunch',
        isImpulse: false,
      },
      {
        id: 'e2',
        amount: 12.50,
        category: 'TRANSPORT',
        date: new Date('2026-02-11T08:00:00Z'),
        notes: null,
        isImpulse: true,
      },
    ]);

    const rows = await reportsService.getExpenseExportData(
      USER_ID,
      new Date('2026-02-01'),
      new Date('2026-02-28'),
      'csv'
    );

    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      date: '2026-02-10',
      category: 'FOOD',
      amount: 45.99,
      notes: 'Restaurant lunch',
      isImpulse: false,
    });
    expect(rows[1]).toEqual({
      date: '2026-02-11',
      category: 'TRANSPORT',
      amount: 12.50,
      notes: '',
      isImpulse: true,
    });
  });

  it('should return empty array when no expenses in range', async () => {
    prisma.expense.findMany.mockResolvedValue([]);

    const rows = await reportsService.getExpenseExportData(
      USER_ID,
      new Date('2026-06-01'),
      new Date('2026-06-30'),
      'json'
    );

    expect(rows).toHaveLength(0);
  });

  it('should pass correct date filters to Prisma', async () => {
    prisma.expense.findMany.mockResolvedValue([]);

    await reportsService.getExpenseExportData(
      USER_ID,
      new Date('2026-03-01'),
      new Date('2026-03-31')
    );

    expect(prisma.expense.findMany).toHaveBeenCalledWith({
      where: {
        userId: USER_ID,
        date: {
          gte: expect.any(Date),
          lte: expect.any(Date),
        },
      },
      orderBy: { date: 'asc' },
    });
  });
});
