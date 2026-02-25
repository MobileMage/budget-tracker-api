const analyticsService = require('./analytics.service');
const prisma = require('../../config/database');

jest.mock('../../config/database', () => ({
  expense: {
    findMany: jest.fn(),
    aggregate: jest.fn(),
  },
  income: {
    aggregate: jest.fn(),
  },
}));

const USER_ID = 'user-uuid-001';

describe('Analytics Service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSpendingHeatmap', () => {
    it('should return spending grouped by day-of-week and hour', async () => {
      // Wednesday 2026-01-14 at 10:00 and 10:30, Friday 2026-01-16 at 20:00
      prisma.expense.findMany.mockResolvedValue([
        { amount: 50, date: new Date('2026-01-14T10:00:00') },
        { amount: 30, date: new Date('2026-01-14T10:30:00') },
        { amount: 100, date: new Date('2026-01-16T20:00:00') },
      ]);

      const result = await analyticsService.getSpendingHeatmap(
        USER_ID,
        new Date('2026-01-01'),
        new Date('2026-01-31')
      );

      expect(prisma.expense.findMany).toHaveBeenCalledWith({
        where: {
          userId: USER_ID,
          date: {
            gte: new Date('2026-01-01'),
            lte: new Date('2026-01-31'),
          },
        },
        select: { amount: true, date: true },
      });

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThanOrEqual(2);

      // Wed = 3, hour 10 should have total 80 and count 2
      const wedSlot = result.find((e) => e.dayOfWeek === new Date('2026-01-14T10:00:00').getDay() && e.hour === 10);
      expect(wedSlot).toBeDefined();
      expect(wedSlot.total).toBe(80);
      expect(wedSlot.count).toBe(2);

      // Fri = 5, hour 20 should have total 100 and count 1
      const friSlot = result.find((e) => e.dayOfWeek === new Date('2026-01-16T20:00:00').getDay() && e.hour === 20);
      expect(friSlot).toBeDefined();
      expect(friSlot.total).toBe(100);
      expect(friSlot.count).toBe(1);
    });

    it('should return empty array when no expenses exist', async () => {
      prisma.expense.findMany.mockResolvedValue([]);

      const result = await analyticsService.getSpendingHeatmap(
        USER_ID,
        new Date('2026-01-01'),
        new Date('2026-01-31')
      );

      expect(result).toEqual([]);
    });

    it('should sort results by dayOfWeek then hour', async () => {
      prisma.expense.findMany.mockResolvedValue([
        { amount: 10, date: new Date('2026-01-18T15:00:00') }, // Sunday
        { amount: 20, date: new Date('2026-01-12T08:00:00') }, // Monday
        { amount: 30, date: new Date('2026-01-12T06:00:00') }, // Monday
      ]);

      const result = await analyticsService.getSpendingHeatmap(
        USER_ID,
        new Date('2026-01-01'),
        new Date('2026-01-31')
      );

      // Should be sorted: Sunday(0) before Monday(1), and within Monday hour 6 before hour 8
      for (let i = 1; i < result.length; i++) {
        const prev = result[i - 1];
        const curr = result[i];
        expect(
          prev.dayOfWeek < curr.dayOfWeek ||
            (prev.dayOfWeek === curr.dayOfWeek && prev.hour <= curr.hour)
        ).toBe(true);
      }
    });
  });

  describe('getCategoryDominance', () => {
    it('should return category breakdown with percentages sorted by total', async () => {
      prisma.expense.findMany.mockResolvedValue([
        { amount: 200, category: 'FOOD' },
        { amount: 100, category: 'FOOD' },
        { amount: 150, category: 'TRANSPORT' },
        { amount: 50, category: 'ENTERTAINMENT' },
      ]);

      const result = await analyticsService.getCategoryDominance(
        USER_ID,
        new Date('2026-01-01'),
        new Date('2026-01-31')
      );

      expect(result).toHaveLength(3);

      // FOOD should be first (300 total)
      expect(result[0].category).toBe('FOOD');
      expect(result[0].total).toBe(300);
      expect(result[0].count).toBe(2);
      expect(result[0].percentage).toBe(60);

      // TRANSPORT second (150 total)
      expect(result[1].category).toBe('TRANSPORT');
      expect(result[1].total).toBe(150);
      expect(result[1].count).toBe(1);
      expect(result[1].percentage).toBe(30);

      // ENTERTAINMENT third (50 total)
      expect(result[2].category).toBe('ENTERTAINMENT');
      expect(result[2].total).toBe(50);
      expect(result[2].count).toBe(1);
      expect(result[2].percentage).toBe(10);
    });

    it('should return empty array when no expenses exist', async () => {
      prisma.expense.findMany.mockResolvedValue([]);

      const result = await analyticsService.getCategoryDominance(
        USER_ID,
        new Date('2026-01-01'),
        new Date('2026-01-31')
      );

      expect(result).toEqual([]);
    });

    it('should handle single category with 100% dominance', async () => {
      prisma.expense.findMany.mockResolvedValue([
        { amount: 500, category: 'RENT' },
      ]);

      const result = await analyticsService.getCategoryDominance(
        USER_ID,
        new Date('2026-01-01'),
        new Date('2026-01-31')
      );

      expect(result).toHaveLength(1);
      expect(result[0].category).toBe('RENT');
      expect(result[0].percentage).toBe(100);
    });
  });

  describe('getSpendingTrend', () => {
    it('should return monthly totals for the last N months', async () => {
      prisma.expense.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 1000 } })
        .mockResolvedValueOnce({ _sum: { amount: 1500 } })
        .mockResolvedValueOnce({ _sum: { amount: 800 } });

      const result = await analyticsService.getSpendingTrend(USER_ID, 3);

      expect(result).toHaveLength(3);
      expect(result[0].total).toBe(1000);
      expect(result[1].total).toBe(1500);
      expect(result[2].total).toBe(800);

      // Each entry should have a YYYY-MM format
      for (const entry of result) {
        expect(entry.month).toMatch(/^\d{4}-\d{2}$/);
      }

      expect(prisma.expense.aggregate).toHaveBeenCalledTimes(3);
    });

    it('should return zero for months with no expenses', async () => {
      prisma.expense.aggregate.mockResolvedValue({ _sum: { amount: null } });

      const result = await analyticsService.getSpendingTrend(USER_ID, 1);

      expect(result).toHaveLength(1);
      expect(result[0].total).toBe(0);
    });
  });

  describe('getBehavioralSummary', () => {
    it('should return a complete behavioral summary', async () => {
      prisma.income.aggregate.mockResolvedValue({
        _sum: { amount: 50000 },
      });

      prisma.expense.findMany.mockResolvedValue([
        { amount: 5000, category: 'FOOD', date: new Date(), isImpulse: false },
        { amount: 3000, category: 'FOOD', date: new Date(), isImpulse: false },
        { amount: 2000, category: 'TRANSPORT', date: new Date(), isImpulse: true },
        { amount: 1000, category: 'ENTERTAINMENT', date: new Date(), isImpulse: true },
        { amount: 4000, category: 'RENT', date: new Date(), isImpulse: false },
      ]);

      prisma.expense.aggregate.mockResolvedValue({
        _sum: { amount: 12000 },
      });

      const result = await analyticsService.getBehavioralSummary(USER_ID);

      expect(result.totalIncome).toBe(50000);
      expect(result.totalExpenses).toBe(15000);
      expect(result.netSavings).toBe(35000);
      expect(result.savingsRate).toBe(70);
      expect(result.topCategory).toBe('FOOD');
      expect(result.topCategoryTotal).toBe(8000);
      expect(result.impulseCount).toBe(2);
      expect(result.impulseTotal).toBe(3000);
      expect(typeof result.averageDailySpend).toBe('number');
      expect(typeof result.spendingChangePercent).toBe('number');
    });

    it('should handle zero income gracefully', async () => {
      prisma.income.aggregate.mockResolvedValue({ _sum: { amount: null } });
      prisma.expense.findMany.mockResolvedValue([]);
      prisma.expense.aggregate.mockResolvedValue({ _sum: { amount: null } });

      const result = await analyticsService.getBehavioralSummary(USER_ID);

      expect(result.totalIncome).toBe(0);
      expect(result.totalExpenses).toBe(0);
      expect(result.netSavings).toBe(0);
      expect(result.savingsRate).toBe(0);
      expect(result.topCategory).toBeNull();
      expect(result.impulseCount).toBe(0);
      expect(result.spendingChangePercent).toBe(0);
    });

    it('should calculate spending change compared to last month', async () => {
      prisma.income.aggregate.mockResolvedValue({ _sum: { amount: 10000 } });

      prisma.expense.findMany.mockResolvedValue([
        { amount: 6000, category: 'FOOD', date: new Date(), isImpulse: false },
      ]);

      // Previous month total was 5000
      prisma.expense.aggregate.mockResolvedValue({
        _sum: { amount: 5000 },
      });

      const result = await analyticsService.getBehavioralSummary(USER_ID);

      // 6000 vs 5000 => +20%
      expect(result.spendingChangePercent).toBe(20);
    });
  });

  describe('getWeeklyComparison', () => {
    it('should return comparison data for this week vs last week', async () => {
      // This week expenses
      prisma.expense.findMany
        .mockResolvedValueOnce([
          { amount: 200, category: 'FOOD' },
          { amount: 100, category: 'TRANSPORT' },
        ])
        // Previous week expenses
        .mockResolvedValueOnce([
          { amount: 150, category: 'FOOD' },
          { amount: 50, category: 'ENTERTAINMENT' },
        ]);

      const result = await analyticsService.getWeeklyComparison(USER_ID);

      expect(result.thisWeekTotal).toBe(300);
      expect(result.prevWeekTotal).toBe(200);
      expect(result.percentChange).toBe(50);
      expect(result.spiked).toBe(true);
      expect(result.categories).toBeInstanceOf(Array);

      // FOOD should appear with current 200 and previous 150
      const food = result.categories.find((c) => c.category === 'FOOD');
      expect(food).toBeDefined();
      expect(food.current).toBe(200);
      expect(food.previous).toBe(150);

      // TRANSPORT should appear with current 100 and previous 0
      const transport = result.categories.find(
        (c) => c.category === 'TRANSPORT'
      );
      expect(transport).toBeDefined();
      expect(transport.current).toBe(100);
      expect(transport.previous).toBe(0);

      // ENTERTAINMENT should appear with current 0 and previous 50
      const entertainment = result.categories.find(
        (c) => c.category === 'ENTERTAINMENT'
      );
      expect(entertainment).toBeDefined();
      expect(entertainment.current).toBe(0);
      expect(entertainment.previous).toBe(50);
    });

    it('should handle weeks with no spending', async () => {
      prisma.expense.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await analyticsService.getWeeklyComparison(USER_ID);

      expect(result.thisWeekTotal).toBe(0);
      expect(result.prevWeekTotal).toBe(0);
      expect(result.spiked).toBe(false);
      expect(result.categories).toEqual([]);
    });

    it('should sort categories by current week total descending', async () => {
      prisma.expense.findMany
        .mockResolvedValueOnce([
          { amount: 50, category: 'FOOD' },
          { amount: 300, category: 'RENT' },
          { amount: 100, category: 'TRANSPORT' },
        ])
        .mockResolvedValueOnce([]);

      const result = await analyticsService.getWeeklyComparison(USER_ID);

      expect(result.categories[0].category).toBe('RENT');
      expect(result.categories[1].category).toBe('TRANSPORT');
      expect(result.categories[2].category).toBe('FOOD');
    });
  });
});
