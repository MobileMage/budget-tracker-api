const forecastService = require('./forecast.service');
const prisma = require('../../config/database');
const {
  calculateBurnRate,
  estimateSurvivalDays,
  getRiskLevel,
} = require('../../utils/financialHelpers');

jest.mock('../../config/database', () => ({
  income: {
    aggregate: jest.fn(),
  },
  expense: {
    aggregate: jest.fn(),
    findMany: jest.fn(),
  },
  forecastSnapshot: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
}));

const USER_ID = 'user-abc-123';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('forecastService.generateForecast', () => {
  it('should calculate balance, burn rate, risk level and persist a snapshot', async () => {
    prisma.income.aggregate.mockResolvedValue({ _sum: { amount: 3000 } });
    prisma.expense.aggregate.mockResolvedValue({ _sum: { amount: 1500 } });
    prisma.expense.findMany.mockResolvedValue([
      { amount: 50 },
      { amount: 30 },
      { amount: 20 },
    ]);

    const burnRate = calculateBurnRate([{ amount: 50 }, { amount: 30 }, { amount: 20 }], 7);
    const balance = 3000 - 1500;
    const estimatedDays = estimateSurvivalDays(balance, burnRate);
    const riskLevel = getRiskLevel(estimatedDays);

    const createdSnapshot = {
      id: 'snap-1',
      userId: USER_ID,
      balance,
      burnRate,
      estimatedDaysLeft: estimatedDays,
      riskLevel,
      createdAt: new Date(),
    };

    prisma.forecastSnapshot.create.mockResolvedValue(createdSnapshot);

    const result = await forecastService.generateForecast(USER_ID);

    expect(prisma.income.aggregate).toHaveBeenCalledTimes(1);
    expect(prisma.expense.aggregate).toHaveBeenCalledTimes(1);
    expect(prisma.expense.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.forecastSnapshot.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: USER_ID,
        balance,
        burnRate,
        estimatedDaysLeft: estimatedDays,
        riskLevel,
      }),
    });
    expect(result).toEqual(createdSnapshot);
  });

  it('should handle zero income and zero expenses', async () => {
    prisma.income.aggregate.mockResolvedValue({ _sum: { amount: null } });
    prisma.expense.aggregate.mockResolvedValue({ _sum: { amount: null } });
    prisma.expense.findMany.mockResolvedValue([]);

    const createdSnapshot = {
      id: 'snap-2',
      userId: USER_ID,
      balance: 0,
      burnRate: 0,
      estimatedDaysLeft: 9999,
      riskLevel: 'SAFE',
      createdAt: new Date(),
    };

    prisma.forecastSnapshot.create.mockResolvedValue(createdSnapshot);

    const result = await forecastService.generateForecast(USER_ID);

    expect(result.balance).toBe(0);
    expect(result.burnRate).toBe(0);
    expect(result.estimatedDaysLeft).toBe(9999);
    expect(result.riskLevel).toBe('SAFE');
  });

  it('should set estimatedDaysLeft to 9999 when burn rate is zero (Infinity survival)', async () => {
    prisma.income.aggregate.mockResolvedValue({ _sum: { amount: 5000 } });
    prisma.expense.aggregate.mockResolvedValue({ _sum: { amount: 1000 } });
    prisma.expense.findMany.mockResolvedValue([]);

    prisma.forecastSnapshot.create.mockImplementation(({ data }) => ({
      id: 'snap-3',
      ...data,
      createdAt: new Date(),
    }));

    const result = await forecastService.generateForecast(USER_ID);

    expect(result.estimatedDaysLeft).toBe(9999);
  });

  it('should handle negative balance (expenses exceed income)', async () => {
    prisma.income.aggregate.mockResolvedValue({ _sum: { amount: 500 } });
    prisma.expense.aggregate.mockResolvedValue({ _sum: { amount: 2000 } });
    prisma.expense.findMany.mockResolvedValue([
      { amount: 100 },
      { amount: 200 },
    ]);

    prisma.forecastSnapshot.create.mockImplementation(({ data }) => ({
      id: 'snap-4',
      ...data,
      createdAt: new Date(),
    }));

    const result = await forecastService.generateForecast(USER_ID);

    expect(result.balance).toBe(-1500);
    expect(result.estimatedDaysLeft).toBe(0);
    expect(result.riskLevel).toBe('DANGER');
  });
});

describe('forecastService.getLatestForecast', () => {
  it('should return the most recent snapshot', async () => {
    const snapshot = {
      id: 'snap-1',
      userId: USER_ID,
      balance: 2000,
      burnRate: 50,
      estimatedDaysLeft: 40,
      riskLevel: 'SAFE',
      createdAt: new Date(),
    };

    prisma.forecastSnapshot.findFirst.mockResolvedValue(snapshot);

    const result = await forecastService.getLatestForecast(USER_ID);

    expect(prisma.forecastSnapshot.findFirst).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      orderBy: { createdAt: 'desc' },
    });
    expect(result).toEqual(snapshot);
  });

  it('should return null when no snapshots exist', async () => {
    prisma.forecastSnapshot.findFirst.mockResolvedValue(null);

    const result = await forecastService.getLatestForecast(USER_ID);

    expect(result).toBeNull();
  });
});

describe('forecastService.getForecastHistory', () => {
  it('should return snapshots with default limit of 30', async () => {
    const snapshots = [
      { id: 'snap-1', createdAt: new Date() },
      { id: 'snap-2', createdAt: new Date() },
    ];

    prisma.forecastSnapshot.findMany.mockResolvedValue(snapshots);

    const result = await forecastService.getForecastHistory(USER_ID);

    expect(prisma.forecastSnapshot.findMany).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    expect(result).toEqual(snapshots);
  });

  it('should respect custom limit', async () => {
    prisma.forecastSnapshot.findMany.mockResolvedValue([]);

    await forecastService.getForecastHistory(USER_ID, 5);

    expect(prisma.forecastSnapshot.findMany).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
  });
});

describe('forecastService.getFinancialHealth', () => {
  it('should return a comprehensive health report', async () => {
    prisma.income.aggregate.mockResolvedValue({ _sum: { amount: 4000 } });

    // First call: current month expenses; Second call: previous month expenses
    prisma.expense.aggregate
      .mockResolvedValueOnce({ _sum: { amount: 2000 } })
      .mockResolvedValueOnce({ _sum: { amount: 1500 } });

    prisma.expense.findMany.mockResolvedValue([
      { amount: 40 },
      { amount: 60 },
      { amount: 50 },
    ]);

    const result = await forecastService.getFinancialHealth(USER_ID);

    expect(result).toHaveProperty('balance', 2000);
    expect(result).toHaveProperty('burnRate');
    expect(result.burnRate).toHaveProperty('daily');
    expect(result.burnRate).toHaveProperty('weekly');
    expect(result.burnRate).toHaveProperty('monthly');
    expect(result).toHaveProperty('estimatedDaysLeft');
    expect(result).toHaveProperty('riskLevel');
    expect(result).toHaveProperty('riskDescription');
    expect(result).toHaveProperty('monthOverMonthChange');
    expect(result).toHaveProperty('suggestedDailyBudget');
  });

  it('should handle zero previous month expenses', async () => {
    prisma.income.aggregate.mockResolvedValue({ _sum: { amount: 3000 } });
    prisma.expense.aggregate
      .mockResolvedValueOnce({ _sum: { amount: 500 } })
      .mockResolvedValueOnce({ _sum: { amount: null } });
    prisma.expense.findMany.mockResolvedValue([{ amount: 20 }]);

    const result = await forecastService.getFinancialHealth(USER_ID);

    expect(result.monthOverMonthChange).toBe(100);
  });

  it('should return zero suggested daily budget when balance is negative', async () => {
    prisma.income.aggregate.mockResolvedValue({ _sum: { amount: 500 } });
    prisma.expense.aggregate
      .mockResolvedValueOnce({ _sum: { amount: 2000 } })
      .mockResolvedValueOnce({ _sum: { amount: 1000 } });
    prisma.expense.findMany.mockResolvedValue([{ amount: 100 }]);

    const result = await forecastService.getFinancialHealth(USER_ID);

    expect(result.balance).toBe(-1500);
    expect(result.suggestedDailyBudget).toBe(0);
  });

  it('should return null estimatedDaysLeft when burn rate is zero', async () => {
    prisma.income.aggregate.mockResolvedValue({ _sum: { amount: 5000 } });
    prisma.expense.aggregate
      .mockResolvedValueOnce({ _sum: { amount: 1000 } })
      .mockResolvedValueOnce({ _sum: { amount: 800 } });
    prisma.expense.findMany.mockResolvedValue([]);

    const result = await forecastService.getFinancialHealth(USER_ID);

    expect(result.estimatedDaysLeft).toBeNull();
  });
});
