const budgetService = require('./budgets.service');

jest.mock('../../config/database', () => ({
  budget: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  expense: {
    aggregate: jest.fn(),
  },
}));

const prisma = require('../../config/database');

describe('Budgets Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const userId = 'user-123';
  const budgetId = 'budget-456';

  const mockBudget = {
    id: budgetId,
    userId,
    category: 'FOOD',
    limit: 500,
    period: 'MONTHLY',
    startDate: new Date('2026-02-01T00:00:00.000Z'),
    createdAt: new Date('2026-02-01T00:00:00.000Z'),
    updatedAt: new Date('2026-02-01T00:00:00.000Z'),
  };

  describe('createBudget', () => {
    it('should create a new budget successfully', async () => {
      prisma.budget.findUnique.mockResolvedValue(null);
      prisma.budget.create.mockResolvedValue(mockBudget);

      const data = {
        category: 'FOOD',
        limit: 500,
        period: 'MONTHLY',
        startDate: new Date('2026-02-01T00:00:00.000Z'),
      };

      const result = await budgetService.createBudget(userId, data);

      expect(prisma.budget.findUnique).toHaveBeenCalledWith({
        where: {
          userId_category_period: {
            userId,
            category: 'FOOD',
            period: 'MONTHLY',
          },
        },
      });
      expect(prisma.budget.create).toHaveBeenCalledWith({
        data: {
          userId,
          category: 'FOOD',
          limit: 500,
          period: 'MONTHLY',
          startDate: data.startDate,
        },
      });
      expect(result).toEqual(mockBudget);
    });

    it('should throw 409 if budget already exists for user/category/period', async () => {
      prisma.budget.findUnique.mockResolvedValue(mockBudget);

      const data = {
        category: 'FOOD',
        limit: 500,
        period: 'MONTHLY',
        startDate: new Date('2026-02-01T00:00:00.000Z'),
      };

      await expect(budgetService.createBudget(userId, data)).rejects.toMatchObject({
        message: 'A MONTHLY budget for FOOD already exists',
        statusCode: 409,
      });

      expect(prisma.budget.create).not.toHaveBeenCalled();
    });
  });

  describe('getBudgets', () => {
    it('should list all budgets for a user', async () => {
      prisma.budget.findMany.mockResolvedValue([mockBudget]);

      const result = await budgetService.getBudgets(userId);

      expect(prisma.budget.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual([mockBudget]);
    });

    it('should filter budgets by category', async () => {
      prisma.budget.findMany.mockResolvedValue([mockBudget]);

      const result = await budgetService.getBudgets(userId, { category: 'FOOD' });

      expect(prisma.budget.findMany).toHaveBeenCalledWith({
        where: { userId, category: 'FOOD' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual([mockBudget]);
    });

    it('should filter budgets by period', async () => {
      prisma.budget.findMany.mockResolvedValue([mockBudget]);

      const result = await budgetService.getBudgets(userId, { period: 'MONTHLY' });

      expect(prisma.budget.findMany).toHaveBeenCalledWith({
        where: { userId, period: 'MONTHLY' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual([mockBudget]);
    });

    it('should filter by both category and period', async () => {
      prisma.budget.findMany.mockResolvedValue([mockBudget]);

      const result = await budgetService.getBudgets(userId, {
        category: 'FOOD',
        period: 'MONTHLY',
      });

      expect(prisma.budget.findMany).toHaveBeenCalledWith({
        where: { userId, category: 'FOOD', period: 'MONTHLY' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual([mockBudget]);
    });
  });

  describe('getBudgetById', () => {
    it('should return a budget when found and owned by user', async () => {
      prisma.budget.findUnique.mockResolvedValue(mockBudget);

      const result = await budgetService.getBudgetById(userId, budgetId);

      expect(prisma.budget.findUnique).toHaveBeenCalledWith({
        where: { id: budgetId },
      });
      expect(result).toEqual(mockBudget);
    });

    it('should throw 404 when budget is not found', async () => {
      prisma.budget.findUnique.mockResolvedValue(null);

      await expect(
        budgetService.getBudgetById(userId, 'nonexistent')
      ).rejects.toMatchObject({
        message: 'Budget not found',
        statusCode: 404,
      });
    });

    it('should throw 404 when budget belongs to a different user', async () => {
      prisma.budget.findUnique.mockResolvedValue({
        ...mockBudget,
        userId: 'other-user',
      });

      await expect(
        budgetService.getBudgetById(userId, budgetId)
      ).rejects.toMatchObject({
        message: 'Budget not found',
        statusCode: 404,
      });
    });
  });

  describe('updateBudget', () => {
    it('should update budget limit', async () => {
      prisma.budget.findUnique.mockResolvedValue(mockBudget);
      const updated = { ...mockBudget, limit: 750 };
      prisma.budget.update.mockResolvedValue(updated);

      const result = await budgetService.updateBudget(userId, budgetId, {
        limit: 750,
      });

      expect(prisma.budget.update).toHaveBeenCalledWith({
        where: { id: budgetId },
        data: { limit: 750 },
      });
      expect(result.limit).toBe(750);
    });

    it('should update budget period', async () => {
      prisma.budget.findUnique.mockResolvedValue(mockBudget);
      const updated = { ...mockBudget, period: 'WEEKLY' };
      prisma.budget.update.mockResolvedValue(updated);

      const result = await budgetService.updateBudget(userId, budgetId, {
        period: 'WEEKLY',
      });

      expect(prisma.budget.update).toHaveBeenCalledWith({
        where: { id: budgetId },
        data: { period: 'WEEKLY' },
      });
      expect(result.period).toBe('WEEKLY');
    });

    it('should throw 404 when budget is not found', async () => {
      prisma.budget.findUnique.mockResolvedValue(null);

      await expect(
        budgetService.updateBudget(userId, 'nonexistent', { limit: 100 })
      ).rejects.toMatchObject({
        message: 'Budget not found',
        statusCode: 404,
      });

      expect(prisma.budget.update).not.toHaveBeenCalled();
    });

    it('should throw 404 when budget belongs to a different user', async () => {
      prisma.budget.findUnique.mockResolvedValue({
        ...mockBudget,
        userId: 'other-user',
      });

      await expect(
        budgetService.updateBudget(userId, budgetId, { limit: 100 })
      ).rejects.toMatchObject({
        message: 'Budget not found',
        statusCode: 404,
      });

      expect(prisma.budget.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteBudget', () => {
    it('should delete a budget owned by the user', async () => {
      prisma.budget.findUnique.mockResolvedValue(mockBudget);
      prisma.budget.delete.mockResolvedValue(mockBudget);

      const result = await budgetService.deleteBudget(userId, budgetId);

      expect(prisma.budget.delete).toHaveBeenCalledWith({
        where: { id: budgetId },
      });
      expect(result).toEqual(mockBudget);
    });

    it('should throw 404 when budget is not found', async () => {
      prisma.budget.findUnique.mockResolvedValue(null);

      await expect(
        budgetService.deleteBudget(userId, 'nonexistent')
      ).rejects.toMatchObject({
        message: 'Budget not found',
        statusCode: 404,
      });

      expect(prisma.budget.delete).not.toHaveBeenCalled();
    });

    it('should throw 404 when budget belongs to a different user', async () => {
      prisma.budget.findUnique.mockResolvedValue({
        ...mockBudget,
        userId: 'other-user',
      });

      await expect(
        budgetService.deleteBudget(userId, budgetId)
      ).rejects.toMatchObject({
        message: 'Budget not found',
        statusCode: 404,
      });

      expect(prisma.budget.delete).not.toHaveBeenCalled();
    });
  });

  describe('getBudgetStatus', () => {
    it('should return status for all budgets with spending calculations', async () => {
      prisma.budget.findMany.mockResolvedValue([mockBudget]);
      prisma.expense.aggregate.mockResolvedValue({
        _sum: { amount: 200 },
      });

      const result = await budgetService.getBudgetStatus(userId);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        budget: mockBudget,
        spent: 200,
        remaining: 300,
        percentUsed: 40,
      });
    });

    it('should handle budgets with no spending', async () => {
      prisma.budget.findMany.mockResolvedValue([mockBudget]);
      prisma.expense.aggregate.mockResolvedValue({
        _sum: { amount: null },
      });

      const result = await budgetService.getBudgetStatus(userId);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        budget: mockBudget,
        spent: 0,
        remaining: 500,
        percentUsed: 0,
      });
    });

    it('should cap remaining at zero when overspent', async () => {
      prisma.budget.findMany.mockResolvedValue([mockBudget]);
      prisma.expense.aggregate.mockResolvedValue({
        _sum: { amount: 600 },
      });

      const result = await budgetService.getBudgetStatus(userId);

      expect(result[0].spent).toBe(600);
      expect(result[0].remaining).toBe(0);
      expect(result[0].percentUsed).toBe(120);
    });

    it('should return empty array when user has no budgets', async () => {
      prisma.budget.findMany.mockResolvedValue([]);

      const result = await budgetService.getBudgetStatus(userId);

      expect(result).toEqual([]);
    });

    it('should handle multiple budgets with different categories', async () => {
      const transportBudget = {
        ...mockBudget,
        id: 'budget-789',
        category: 'TRANSPORT',
        limit: 200,
        period: 'WEEKLY',
      };

      prisma.budget.findMany.mockResolvedValue([mockBudget, transportBudget]);
      prisma.expense.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 350 } })
        .mockResolvedValueOnce({ _sum: { amount: 50 } });

      const result = await budgetService.getBudgetStatus(userId);

      expect(result).toHaveLength(2);
      expect(result[0].spent).toBe(350);
      expect(result[0].remaining).toBe(150);
      expect(result[1].spent).toBe(50);
      expect(result[1].remaining).toBe(150);
    });
  });
});
