const recommendationsService = require('./recommendations.service');
const prisma = require('../../config/database');

jest.mock('../../config/database', () => ({
  income: {
    aggregate: jest.fn(),
  },
  expense: {
    findMany: jest.fn(),
  },
  recommendation: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
}));

const USER_ID = 'user-uuid-001';

describe('Recommendations Service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateRecommendations', () => {
    it('should generate a food recommendation when food spending exceeds 40%', async () => {
      prisma.income.aggregate.mockResolvedValue({
        _sum: { amount: 10000 },
      });

      // Month expenses: 6000 on food out of 10000 total => 60%
      const monthExpenses = [
        { amount: 6000, category: 'FOOD', date: new Date('2026-02-10T12:00:00'), isImpulse: false },
        { amount: 4000, category: 'TRANSPORT', date: new Date('2026-02-11T14:00:00'), isImpulse: false },
      ];

      prisma.expense.findMany
        .mockResolvedValueOnce(monthExpenses)     // month expenses
        .mockResolvedValueOnce([])                // this week expenses
        .mockResolvedValueOnce([]);               // prev week expenses

      prisma.recommendation.deleteMany.mockResolvedValue({ count: 0 });

      let createCallIndex = 0;
      prisma.recommendation.create.mockImplementation(({ data }) => {
        createCallIndex++;
        return Promise.resolve({
          id: `rec-${createCallIndex}`,
          userId: data.userId,
          tip: data.tip,
          category: data.category,
          generatedAt: new Date(),
        });
      });

      const result = await recommendationsService.generateRecommendations(USER_ID);

      // Should have at least the food tip
      const foodTip = result.find((r) => r.category === 'FOOD');
      expect(foodTip).toBeDefined();
      expect(foodTip.tip).toContain('meal prepping');
    });

    it('should generate a savings rate recommendation when savings rate is below 10%', async () => {
      // Income 10000, expenses 9500 => savings rate 5%
      prisma.income.aggregate.mockResolvedValue({
        _sum: { amount: 10000 },
      });

      prisma.expense.findMany
        .mockResolvedValueOnce([
          { amount: 5000, category: 'RENT', date: new Date('2026-02-05T10:00:00'), isImpulse: false },
          { amount: 4500, category: 'FOOD', date: new Date('2026-02-08T18:00:00'), isImpulse: false },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      prisma.recommendation.deleteMany.mockResolvedValue({ count: 0 });

      let createCallIndex = 0;
      prisma.recommendation.create.mockImplementation(({ data }) => {
        createCallIndex++;
        return Promise.resolve({
          id: `rec-${createCallIndex}`,
          userId: data.userId,
          tip: data.tip,
          category: data.category,
          generatedAt: new Date(),
        });
      });

      const result = await recommendationsService.generateRecommendations(USER_ID);

      const savingsTip = result.find((r) => r.tip.includes('10%'));
      expect(savingsTip).toBeDefined();
    });

    it('should generate a transport recommendation when transport spending exceeds 5000', async () => {
      prisma.income.aggregate.mockResolvedValue({
        _sum: { amount: 50000 },
      });

      prisma.expense.findMany
        .mockResolvedValueOnce([
          { amount: 6000, category: 'TRANSPORT', date: new Date('2026-02-05T09:00:00'), isImpulse: false },
          { amount: 10000, category: 'RENT', date: new Date('2026-02-01T10:00:00'), isImpulse: false },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      prisma.recommendation.deleteMany.mockResolvedValue({ count: 0 });

      let createCallIndex = 0;
      prisma.recommendation.create.mockImplementation(({ data }) => {
        createCallIndex++;
        return Promise.resolve({
          id: `rec-${createCallIndex}`,
          userId: data.userId,
          tip: data.tip,
          category: data.category,
          generatedAt: new Date(),
        });
      });

      const result = await recommendationsService.generateRecommendations(USER_ID);

      const transportTip = result.find((r) => r.category === 'TRANSPORT');
      expect(transportTip).toBeDefined();
      expect(transportTip.tip).toContain('transport pass');
    });

    it('should generate an entertainment recommendation when entertainment exceeds 25%', async () => {
      prisma.income.aggregate.mockResolvedValue({
        _sum: { amount: 20000 },
      });

      // entertainment 3000 out of 10000 total => 30%
      prisma.expense.findMany
        .mockResolvedValueOnce([
          { amount: 3000, category: 'ENTERTAINMENT', date: new Date('2026-02-10T20:00:00'), isImpulse: false },
          { amount: 7000, category: 'RENT', date: new Date('2026-02-01T10:00:00'), isImpulse: false },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      prisma.recommendation.deleteMany.mockResolvedValue({ count: 0 });

      let createCallIndex = 0;
      prisma.recommendation.create.mockImplementation(({ data }) => {
        createCallIndex++;
        return Promise.resolve({
          id: `rec-${createCallIndex}`,
          userId: data.userId,
          tip: data.tip,
          category: data.category,
          generatedAt: new Date(),
        });
      });

      const result = await recommendationsService.generateRecommendations(USER_ID);

      const entertainmentTip = result.find((r) => r.category === 'ENTERTAINMENT');
      expect(entertainmentTip).toBeDefined();
      expect(entertainmentTip.tip).toContain('free campus events');
    });

    it('should generate a late-night recommendation when late-night count exceeds 3', async () => {
      prisma.income.aggregate.mockResolvedValue({
        _sum: { amount: 20000 },
      });

      // 4 late-night purchases (hour 23 or 0 or 1)
      prisma.expense.findMany
        .mockResolvedValueOnce([
          { amount: 100, category: 'FOOD', date: new Date('2026-02-05T23:30:00'), isImpulse: false },
          { amount: 200, category: 'SHOPPING', date: new Date('2026-02-06T00:15:00'), isImpulse: false },
          { amount: 150, category: 'FOOD', date: new Date('2026-02-07T01:00:00'), isImpulse: false },
          { amount: 300, category: 'ENTERTAINMENT', date: new Date('2026-02-08T23:45:00'), isImpulse: false },
          { amount: 5000, category: 'RENT', date: new Date('2026-02-01T10:00:00'), isImpulse: false },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      prisma.recommendation.deleteMany.mockResolvedValue({ count: 0 });

      let createCallIndex = 0;
      prisma.recommendation.create.mockImplementation(({ data }) => {
        createCallIndex++;
        return Promise.resolve({
          id: `rec-${createCallIndex}`,
          userId: data.userId,
          tip: data.tip,
          category: data.category,
          generatedAt: new Date(),
        });
      });

      const result = await recommendationsService.generateRecommendations(USER_ID);

      const lateNightTip = result.find((r) => r.tip.includes('curfew'));
      expect(lateNightTip).toBeDefined();
    });

    it('should generate a shopping recommendation when shopping exceeds 20%', async () => {
      prisma.income.aggregate.mockResolvedValue({
        _sum: { amount: 30000 },
      });

      // shopping 2500 out of 10000 total => 25%
      prisma.expense.findMany
        .mockResolvedValueOnce([
          { amount: 2500, category: 'SHOPPING', date: new Date('2026-02-10T15:00:00'), isImpulse: false },
          { amount: 7500, category: 'RENT', date: new Date('2026-02-01T10:00:00'), isImpulse: false },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      prisma.recommendation.deleteMany.mockResolvedValue({ count: 0 });

      let createCallIndex = 0;
      prisma.recommendation.create.mockImplementation(({ data }) => {
        createCallIndex++;
        return Promise.resolve({
          id: `rec-${createCallIndex}`,
          userId: data.userId,
          tip: data.tip,
          category: data.category,
          generatedAt: new Date(),
        });
      });

      const result = await recommendationsService.generateRecommendations(USER_ID);

      const shoppingTip = result.find((r) => r.category === 'SHOPPING');
      expect(shoppingTip).toBeDefined();
      expect(shoppingTip.tip).toContain('no-spend challenge');
    });

    it('should generate a weekly spike recommendation when spending spiked', async () => {
      prisma.income.aggregate.mockResolvedValue({
        _sum: { amount: 50000 },
      });

      prisma.expense.findMany
        .mockResolvedValueOnce([
          { amount: 10000, category: 'RENT', date: new Date('2026-02-01T10:00:00'), isImpulse: false },
        ])
        // This week: 5000
        .mockResolvedValueOnce([{ amount: 5000 }])
        // Prev week: 1000 => spike > 20%
        .mockResolvedValueOnce([{ amount: 1000 }]);

      prisma.recommendation.deleteMany.mockResolvedValue({ count: 0 });

      let createCallIndex = 0;
      prisma.recommendation.create.mockImplementation(({ data }) => {
        createCallIndex++;
        return Promise.resolve({
          id: `rec-${createCallIndex}`,
          userId: data.userId,
          tip: data.tip,
          category: data.category,
          generatedAt: new Date(),
        });
      });

      const result = await recommendationsService.generateRecommendations(USER_ID);

      const spikeTip = result.find((r) => r.tip.includes('spiked'));
      expect(spikeTip).toBeDefined();
    });

    it('should return empty array when no rules match', async () => {
      prisma.income.aggregate.mockResolvedValue({
        _sum: { amount: 100000 },
      });

      // Healthy spending: well-distributed, under thresholds
      prisma.expense.findMany
        .mockResolvedValueOnce([
          { amount: 2000, category: 'FOOD', date: new Date('2026-02-05T12:00:00'), isImpulse: false },
          { amount: 2000, category: 'TRANSPORT', date: new Date('2026-02-08T14:00:00'), isImpulse: false },
          { amount: 1000, category: 'ENTERTAINMENT', date: new Date('2026-02-10T16:00:00'), isImpulse: false },
          { amount: 1000, category: 'SHOPPING', date: new Date('2026-02-12T11:00:00'), isImpulse: false },
        ])
        .mockResolvedValueOnce([{ amount: 3000 }])
        .mockResolvedValueOnce([{ amount: 3000 }]);

      prisma.recommendation.deleteMany.mockResolvedValue({ count: 0 });

      const result = await recommendationsService.generateRecommendations(USER_ID);

      expect(result).toEqual([]);
    });

    it('should delete old recommendations before generating new ones', async () => {
      prisma.income.aggregate.mockResolvedValue({
        _sum: { amount: 100000 },
      });

      prisma.expense.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      prisma.recommendation.deleteMany.mockResolvedValue({ count: 3 });

      await recommendationsService.generateRecommendations(USER_ID);

      expect(prisma.recommendation.deleteMany).toHaveBeenCalledWith({
        where: { userId: USER_ID },
      });
    });
  });

  describe('getRecommendations', () => {
    it('should return paginated recommendations', async () => {
      const mockRecs = [
        {
          id: 'rec-1',
          userId: USER_ID,
          tip: 'Consider meal prepping to cut food costs by up to 30%.',
          category: 'FOOD',
          generatedAt: new Date(),
        },
        {
          id: 'rec-2',
          userId: USER_ID,
          tip: 'Aim to save at least 10% of your allowance each cycle.',
          category: null,
          generatedAt: new Date(),
        },
      ];

      prisma.recommendation.findMany.mockResolvedValue(mockRecs);
      prisma.recommendation.count.mockResolvedValue(2);

      const result = await recommendationsService.getRecommendations(USER_ID, {
        page: '1',
        limit: '10',
      });

      expect(result.recommendations).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);

      expect(prisma.recommendation.findMany).toHaveBeenCalledWith({
        where: { userId: USER_ID },
        orderBy: { generatedAt: 'desc' },
        skip: 0,
        take: 10,
      });
    });

    it('should filter by category when provided', async () => {
      prisma.recommendation.findMany.mockResolvedValue([]);
      prisma.recommendation.count.mockResolvedValue(0);

      await recommendationsService.getRecommendations(USER_ID, {
        category: 'FOOD',
        page: '1',
        limit: '5',
      });

      expect(prisma.recommendation.findMany).toHaveBeenCalledWith({
        where: { userId: USER_ID, category: 'FOOD' },
        orderBy: { generatedAt: 'desc' },
        skip: 0,
        take: 5,
      });
    });

    it('should use default pagination when not provided', async () => {
      prisma.recommendation.findMany.mockResolvedValue([]);
      prisma.recommendation.count.mockResolvedValue(0);

      const result = await recommendationsService.getRecommendations(USER_ID);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);

      expect(prisma.recommendation.findMany).toHaveBeenCalledWith({
        where: { userId: USER_ID },
        orderBy: { generatedAt: 'desc' },
        skip: 0,
        take: 10,
      });
    });

    it('should calculate correct skip for page 2', async () => {
      prisma.recommendation.findMany.mockResolvedValue([]);
      prisma.recommendation.count.mockResolvedValue(15);

      const result = await recommendationsService.getRecommendations(USER_ID, {
        page: '2',
        limit: '5',
      });

      expect(result.totalPages).toBe(3);

      expect(prisma.recommendation.findMany).toHaveBeenCalledWith({
        where: { userId: USER_ID },
        orderBy: { generatedAt: 'desc' },
        skip: 5,
        take: 5,
      });
    });
  });

  describe('dismissRecommendation', () => {
    it('should delete the recommendation and return it', async () => {
      const mockRec = {
        id: 'rec-1',
        userId: USER_ID,
        tip: 'Consider meal prepping to cut food costs by up to 30%.',
        category: 'FOOD',
        generatedAt: new Date(),
      };

      prisma.recommendation.findUnique.mockResolvedValue(mockRec);
      prisma.recommendation.delete.mockResolvedValue(mockRec);

      const result = await recommendationsService.dismissRecommendation(
        USER_ID,
        'rec-1'
      );

      expect(result).toEqual(mockRec);
      expect(prisma.recommendation.delete).toHaveBeenCalledWith({
        where: { id: 'rec-1' },
      });
    });

    it('should throw 404 when recommendation does not exist', async () => {
      prisma.recommendation.findUnique.mockResolvedValue(null);

      await expect(
        recommendationsService.dismissRecommendation(USER_ID, 'nonexistent')
      ).rejects.toThrow('Recommendation not found');

      await expect(
        recommendationsService.dismissRecommendation(USER_ID, 'nonexistent')
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('should throw 404 when recommendation belongs to a different user', async () => {
      const mockRec = {
        id: 'rec-1',
        userId: 'other-user-id',
        tip: 'Some tip',
        category: null,
        generatedAt: new Date(),
      };

      prisma.recommendation.findUnique.mockResolvedValue(mockRec);

      await expect(
        recommendationsService.dismissRecommendation(USER_ID, 'rec-1')
      ).rejects.toThrow('Recommendation not found');

      expect(prisma.recommendation.delete).not.toHaveBeenCalled();
    });
  });

  describe('rules', () => {
    it('should export 8 rules', () => {
      expect(recommendationsService.rules).toHaveLength(8);
    });

    it('every rule should have a condition function and a tip string', () => {
      for (const rule of recommendationsService.rules) {
        expect(typeof rule.condition).toBe('function');
        expect(typeof rule.tip).toBe('string');
        expect(rule.tip.length).toBeGreaterThan(0);
        expect(rule).toHaveProperty('category');
      }
    });

    it('food rule triggers when foodPercent > 40', () => {
      const foodRule = recommendationsService.rules[0];
      expect(foodRule.condition({ foodPercent: 50 })).toBe(true);
      expect(foodRule.condition({ foodPercent: 40 })).toBe(false);
      expect(foodRule.condition({ foodPercent: 30 })).toBe(false);
    });

    it('impulse rule triggers when impulseScore > 5', () => {
      const impulseRule = recommendationsService.rules[1];
      expect(impulseRule.condition({ impulseScore: 6 })).toBe(true);
      expect(impulseRule.condition({ impulseScore: 5 })).toBe(false);
    });

    it('savings rule triggers when savingsRate < 10', () => {
      const savingsRule = recommendationsService.rules[2];
      expect(savingsRule.condition({ savingsRate: 5 })).toBe(true);
      expect(savingsRule.condition({ savingsRate: 10 })).toBe(false);
      expect(savingsRule.condition({ savingsRate: 15 })).toBe(false);
    });

    it('transport rule triggers when transportTotal > 5000', () => {
      const transportRule = recommendationsService.rules[3];
      expect(transportRule.condition({ transportTotal: 6000 })).toBe(true);
      expect(transportRule.condition({ transportTotal: 5000 })).toBe(false);
    });

    it('entertainment rule triggers when entertainmentPercent > 25', () => {
      const entertainmentRule = recommendationsService.rules[4];
      expect(entertainmentRule.condition({ entertainmentPercent: 30 })).toBe(true);
      expect(entertainmentRule.condition({ entertainmentPercent: 25 })).toBe(false);
    });

    it('late-night rule triggers when lateNightCount > 3', () => {
      const lateNightRule = recommendationsService.rules[5];
      expect(lateNightRule.condition({ lateNightCount: 4 })).toBe(true);
      expect(lateNightRule.condition({ lateNightCount: 3 })).toBe(false);
    });

    it('shopping rule triggers when shoppingPercent > 20', () => {
      const shoppingRule = recommendationsService.rules[6];
      expect(shoppingRule.condition({ shoppingPercent: 25 })).toBe(true);
      expect(shoppingRule.condition({ shoppingPercent: 20 })).toBe(false);
    });

    it('weekly spike rule triggers when weeklySpike is true', () => {
      const spikeRule = recommendationsService.rules[7];
      expect(spikeRule.condition({ weeklySpike: true })).toBe(true);
      expect(spikeRule.condition({ weeklySpike: false })).toBe(false);
    });
  });
});
