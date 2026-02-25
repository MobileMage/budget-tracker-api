const alertService = require('./alerts.service');

jest.mock('../../config/database', () => ({
  budget: {
    findFirst: jest.fn(),
  },
  expense: {
    aggregate: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  income: {
    findFirst: jest.fn(),
  },
  alert: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
}));

const prisma = require('../../config/database');

describe('Alerts Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const userId = 'user-123';
  const alertId = 'alert-456';

  describe('checkOverspending', () => {
    const expense = {
      id: 'expense-1',
      category: 'FOOD',
      amount: 50,
      date: new Date('2026-02-15T14:00:00.000Z'),
    };

    it('should create OVERSPENDING alert when spending exceeds budget by more than 10%', async () => {
      prisma.budget.findFirst.mockResolvedValue({
        id: 'budget-1',
        userId,
        category: 'FOOD',
        limit: 200,
        period: 'MONTHLY',
      });

      // Total spent: 250, which is > 220 (200 * 1.1)
      prisma.expense.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 250 } }) // category total
        .mockResolvedValueOnce({ _sum: { amount: 300 } }) // this week
        .mockResolvedValueOnce({ _sum: { amount: 300 } }); // last week

      const mockAlert = {
        id: 'alert-1',
        userId,
        type: 'OVERSPENDING',
        message: expect.any(String),
      };
      prisma.alert.create.mockResolvedValue(mockAlert);

      const alerts = await alertService.checkOverspending(userId, expense);

      expect(prisma.budget.findFirst).toHaveBeenCalledWith({
        where: { userId, category: 'FOOD' },
      });
      expect(alerts.length).toBeGreaterThanOrEqual(1);
      expect(alerts[0].type).toBe('OVERSPENDING');
    });

    it('should not create OVERSPENDING alert when spending is within 10% of budget', async () => {
      prisma.budget.findFirst.mockResolvedValue({
        id: 'budget-1',
        userId,
        category: 'FOOD',
        limit: 200,
        period: 'MONTHLY',
      });

      // Total spent: 210, which is <= 220 (200 * 1.1)
      prisma.expense.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 210 } }) // category total
        .mockResolvedValueOnce({ _sum: { amount: 100 } }) // this week
        .mockResolvedValueOnce({ _sum: { amount: 100 } }); // last week

      const alerts = await alertService.checkOverspending(userId, expense);

      const overspendingAlerts = alerts.filter((a) => a && a.type === 'OVERSPENDING');
      expect(overspendingAlerts).toHaveLength(0);
    });

    it('should not create OVERSPENDING alert when no budget exists for category', async () => {
      prisma.budget.findFirst.mockResolvedValue(null);

      prisma.expense.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 100 } }) // this week
        .mockResolvedValueOnce({ _sum: { amount: 100 } }); // last week

      const alerts = await alertService.checkOverspending(userId, expense);

      const overspendingAlerts = alerts.filter((a) => a && a.type === 'OVERSPENDING');
      expect(overspendingAlerts).toHaveLength(0);
    });

    it('should create SPIKE alert when this week spending is 40% higher than last week', async () => {
      prisma.budget.findFirst.mockResolvedValue(null);

      // This week: 280, Last week: 200 => 40% increase
      prisma.expense.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 280 } }) // this week
        .mockResolvedValueOnce({ _sum: { amount: 150 } }); // last week (280/150 = 86% > 40%)

      const mockAlert = {
        id: 'alert-spike',
        userId,
        type: 'SPIKE',
        message: expect.any(String),
      };
      prisma.alert.create.mockResolvedValue(mockAlert);

      const alerts = await alertService.checkOverspending(userId, expense);

      const spikeAlerts = alerts.filter((a) => a.type === 'SPIKE');
      expect(spikeAlerts).toHaveLength(1);
    });

    it('should not create SPIKE alert when spending increase is below 40%', async () => {
      prisma.budget.findFirst.mockResolvedValue(null);

      // This week: 130, Last week: 100 => 30% increase (below 40%)
      prisma.expense.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 130 } }) // this week
        .mockResolvedValueOnce({ _sum: { amount: 100 } }); // last week

      const alerts = await alertService.checkOverspending(userId, expense);

      const spikeAlerts = alerts.filter((a) => a && a.type === 'SPIKE');
      expect(spikeAlerts).toHaveLength(0);
    });

    it('should create SPIKE alert when there is spending this week but none last week', async () => {
      prisma.budget.findFirst.mockResolvedValue(null);

      prisma.expense.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 100 } }) // this week
        .mockResolvedValueOnce({ _sum: { amount: null } }); // last week (no spending)

      const mockAlert = {
        id: 'alert-spike',
        userId,
        type: 'SPIKE',
        message: expect.any(String),
      };
      prisma.alert.create.mockResolvedValue(mockAlert);

      const alerts = await alertService.checkOverspending(userId, expense);

      const spikeAlerts = alerts.filter((a) => a.type === 'SPIKE');
      expect(spikeAlerts).toHaveLength(1);
    });

    it('should create both OVERSPENDING and SPIKE alerts when both conditions are met', async () => {
      prisma.budget.findFirst.mockResolvedValue({
        id: 'budget-1',
        userId,
        category: 'FOOD',
        limit: 100,
        period: 'MONTHLY',
      });

      // Category total exceeds budget by >10%
      prisma.expense.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 150 } }) // category total: 150 > 110
        .mockResolvedValueOnce({ _sum: { amount: 300 } }) // this week
        .mockResolvedValueOnce({ _sum: { amount: 100 } }); // last week (200% increase)

      let createCallCount = 0;
      prisma.alert.create.mockImplementation(() => {
        createCallCount++;
        if (createCallCount === 1) {
          return Promise.resolve({ id: 'alert-os', userId, type: 'OVERSPENDING', message: 'over' });
        }
        return Promise.resolve({ id: 'alert-spike', userId, type: 'SPIKE', message: 'spike' });
      });

      const alerts = await alertService.checkOverspending(userId, expense);

      expect(alerts).toHaveLength(2);
      expect(alerts.map((a) => a.type)).toContain('OVERSPENDING');
      expect(alerts.map((a) => a.type)).toContain('SPIKE');
    });
  });

  describe('checkImpulseSpending', () => {
    it('should flag expense as impulse and create IMPULSE alert when 3+ purchases in 60 minutes', async () => {
      const now = new Date('2026-02-15T14:30:00.000Z');
      const expense = {
        id: 'expense-3',
        category: 'SHOPPING',
        amount: 25,
        date: now,
        createdAt: now,
      };

      prisma.expense.findMany.mockResolvedValue([
        { id: 'expense-1', amount: 10, createdAt: new Date('2026-02-15T14:00:00.000Z') },
        { id: 'expense-2', amount: 15, createdAt: new Date('2026-02-15T14:15:00.000Z') },
        { id: 'expense-3', amount: 25, createdAt: now },
      ]);

      prisma.expense.update.mockResolvedValue({ ...expense, isImpulse: true });

      const mockAlert = {
        id: 'alert-impulse',
        userId,
        type: 'IMPULSE',
        message: expect.any(String),
      };
      prisma.alert.create.mockResolvedValue(mockAlert);
      prisma.income.findFirst.mockResolvedValue(null);

      const alerts = await alertService.checkImpulseSpending(userId, expense);

      expect(prisma.expense.update).toHaveBeenCalledWith({
        where: { id: 'expense-3' },
        data: { isImpulse: true },
      });

      const impulseAlerts = alerts.filter((a) => a.type === 'IMPULSE');
      expect(impulseAlerts).toHaveLength(1);
    });

    it('should not flag as impulse when fewer than 3 purchases in 60 minutes', async () => {
      const now = new Date('2026-02-15T14:30:00.000Z');
      const expense = {
        id: 'expense-2',
        category: 'SHOPPING',
        amount: 25,
        date: now,
        createdAt: now,
      };

      prisma.expense.findMany.mockResolvedValue([
        { id: 'expense-1', amount: 10, createdAt: new Date('2026-02-15T14:00:00.000Z') },
        { id: 'expense-2', amount: 25, createdAt: now },
      ]);

      prisma.income.findFirst.mockResolvedValue(null);

      const alerts = await alertService.checkImpulseSpending(userId, expense);

      expect(prisma.expense.update).not.toHaveBeenCalled();
      const impulseAlerts = alerts.filter((a) => a && a.type === 'IMPULSE');
      expect(impulseAlerts).toHaveLength(0);
    });

    it('should create LATE_NIGHT alert for expense between 11pm and 2am', async () => {
      const lateNight = new Date('2026-02-15T23:30:00.000Z');
      const expense = {
        id: 'expense-late',
        category: 'FOOD',
        amount: 15,
        date: lateNight,
        createdAt: lateNight,
      };

      prisma.expense.findMany.mockResolvedValue([expense]);
      prisma.income.findFirst.mockResolvedValue(null);

      const mockAlert = {
        id: 'alert-late',
        userId,
        type: 'LATE_NIGHT',
        message: expect.any(String),
      };
      prisma.alert.create.mockResolvedValue(mockAlert);

      const alerts = await alertService.checkImpulseSpending(userId, expense);

      const lateAlerts = alerts.filter((a) => a.type === 'LATE_NIGHT');
      expect(lateAlerts).toHaveLength(1);
    });

    it('should not create LATE_NIGHT alert for daytime expense', async () => {
      const daytime = new Date('2026-02-15T14:00:00.000Z');
      const expense = {
        id: 'expense-day',
        category: 'FOOD',
        amount: 15,
        date: daytime,
        createdAt: daytime,
      };

      prisma.expense.findMany.mockResolvedValue([expense]);
      prisma.income.findFirst.mockResolvedValue(null);

      const alerts = await alertService.checkImpulseSpending(userId, expense);

      const lateAlerts = alerts.filter((a) => a && a.type === 'LATE_NIGHT');
      expect(lateAlerts).toHaveLength(0);
    });

    it('should create POST_INCOME alert when income was received in last 24 hours', async () => {
      const now = new Date('2026-02-15T14:00:00.000Z');
      const expense = {
        id: 'expense-post',
        category: 'SHOPPING',
        amount: 100,
        date: now,
        createdAt: now,
      };

      prisma.expense.findMany.mockResolvedValue([expense]);
      prisma.income.findFirst.mockResolvedValue({
        id: 'income-1',
        amount: 2000,
        source: 'Salary',
        date: new Date('2026-02-15T08:00:00.000Z'),
      });

      const mockAlert = {
        id: 'alert-post',
        userId,
        type: 'POST_INCOME',
        message: expect.any(String),
      };
      prisma.alert.create.mockResolvedValue(mockAlert);

      const alerts = await alertService.checkImpulseSpending(userId, expense);

      const postIncomeAlerts = alerts.filter((a) => a.type === 'POST_INCOME');
      expect(postIncomeAlerts).toHaveLength(1);
    });

    it('should not create POST_INCOME alert when no recent income', async () => {
      const now = new Date('2026-02-15T14:00:00.000Z');
      const expense = {
        id: 'expense-no-income',
        category: 'SHOPPING',
        amount: 100,
        date: now,
        createdAt: now,
      };

      prisma.expense.findMany.mockResolvedValue([expense]);
      prisma.income.findFirst.mockResolvedValue(null);

      const alerts = await alertService.checkImpulseSpending(userId, expense);

      const postIncomeAlerts = alerts.filter((a) => a && a.type === 'POST_INCOME');
      expect(postIncomeAlerts).toHaveLength(0);
    });

    it('should create multiple alerts when multiple conditions are met', async () => {
      // Late night + impulse (3 purchases) + post-income
      const lateNight = new Date('2026-02-15T23:45:00.000Z');
      const expense = {
        id: 'expense-multi',
        category: 'SHOPPING',
        amount: 50,
        date: lateNight,
        createdAt: lateNight,
      };

      prisma.expense.findMany.mockResolvedValue([
        { id: 'expense-a', amount: 20, createdAt: new Date('2026-02-15T23:10:00.000Z') },
        { id: 'expense-b', amount: 30, createdAt: new Date('2026-02-15T23:25:00.000Z') },
        { id: 'expense-multi', amount: 50, createdAt: lateNight },
      ]);

      prisma.expense.update.mockResolvedValue({ ...expense, isImpulse: true });

      prisma.income.findFirst.mockResolvedValue({
        id: 'income-1',
        amount: 1500,
        source: 'Freelance',
        date: new Date('2026-02-15T20:00:00.000Z'),
      });

      let callCount = 0;
      prisma.alert.create.mockImplementation(() => {
        callCount++;
        const types = ['IMPULSE', 'LATE_NIGHT', 'POST_INCOME'];
        return Promise.resolve({
          id: `alert-${callCount}`,
          userId,
          type: types[callCount - 1] || 'IMPULSE',
          message: 'test',
        });
      });

      const alerts = await alertService.checkImpulseSpending(userId, expense);

      expect(alerts).toHaveLength(3);
      expect(alerts.map((a) => a.type)).toContain('IMPULSE');
      expect(alerts.map((a) => a.type)).toContain('LATE_NIGHT');
      expect(alerts.map((a) => a.type)).toContain('POST_INCOME');
    });
  });

  describe('getAlerts', () => {
    const mockAlerts = [
      { id: 'alert-1', userId, type: 'OVERSPENDING', message: 'Over budget', isRead: false, triggeredAt: new Date() },
      { id: 'alert-2', userId, type: 'SPIKE', message: 'Spike detected', isRead: true, triggeredAt: new Date() },
    ];

    it('should return paginated alerts', async () => {
      prisma.alert.findMany.mockResolvedValue(mockAlerts);
      prisma.alert.count.mockResolvedValue(2);

      const result = await alertService.getAlerts(userId);

      expect(result).toEqual({
        alerts: mockAlerts,
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('should filter alerts by type', async () => {
      prisma.alert.findMany.mockResolvedValue([mockAlerts[0]]);
      prisma.alert.count.mockResolvedValue(1);

      const result = await alertService.getAlerts(userId, { type: 'OVERSPENDING' });

      expect(prisma.alert.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId, type: 'OVERSPENDING' },
        })
      );
      expect(result.total).toBe(1);
    });

    it('should filter alerts by isRead status', async () => {
      prisma.alert.findMany.mockResolvedValue([mockAlerts[0]]);
      prisma.alert.count.mockResolvedValue(1);

      const result = await alertService.getAlerts(userId, { isRead: 'false' });

      expect(prisma.alert.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId, isRead: false },
        })
      );
      expect(result.total).toBe(1);
    });

    it('should respect page and limit parameters', async () => {
      prisma.alert.findMany.mockResolvedValue([]);
      prisma.alert.count.mockResolvedValue(50);

      const result = await alertService.getAlerts(userId, {
        page: '3',
        limit: '10',
      });

      expect(prisma.alert.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        })
      );
      expect(result.page).toBe(3);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(5);
    });

    it('should default to page 1 and limit 20', async () => {
      prisma.alert.findMany.mockResolvedValue([]);
      prisma.alert.count.mockResolvedValue(0);

      const result = await alertService.getAlerts(userId, {});

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should cap limit at 100', async () => {
      prisma.alert.findMany.mockResolvedValue([]);
      prisma.alert.count.mockResolvedValue(0);

      const result = await alertService.getAlerts(userId, { limit: '500' });

      expect(result.limit).toBe(100);
      expect(prisma.alert.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 })
      );
    });
  });

  describe('markAsRead', () => {
    it('should mark an alert as read', async () => {
      const mockAlert = {
        id: alertId,
        userId,
        type: 'OVERSPENDING',
        isRead: false,
      };

      prisma.alert.findUnique.mockResolvedValue(mockAlert);
      prisma.alert.update.mockResolvedValue({ ...mockAlert, isRead: true });

      const result = await alertService.markAsRead(userId, alertId);

      expect(prisma.alert.update).toHaveBeenCalledWith({
        where: { id: alertId },
        data: { isRead: true },
      });
      expect(result.isRead).toBe(true);
    });

    it('should throw 404 when alert is not found', async () => {
      prisma.alert.findUnique.mockResolvedValue(null);

      await expect(
        alertService.markAsRead(userId, 'nonexistent')
      ).rejects.toMatchObject({
        message: 'Alert not found',
        statusCode: 404,
      });

      expect(prisma.alert.update).not.toHaveBeenCalled();
    });

    it('should throw 404 when alert belongs to a different user', async () => {
      prisma.alert.findUnique.mockResolvedValue({
        id: alertId,
        userId: 'other-user',
        type: 'OVERSPENDING',
        isRead: false,
      });

      await expect(
        alertService.markAsRead(userId, alertId)
      ).rejects.toMatchObject({
        message: 'Alert not found',
        statusCode: 404,
      });

      expect(prisma.alert.update).not.toHaveBeenCalled();
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all unread alerts as read', async () => {
      prisma.alert.updateMany.mockResolvedValue({ count: 5 });

      const result = await alertService.markAllAsRead(userId);

      expect(prisma.alert.updateMany).toHaveBeenCalledWith({
        where: { userId, isRead: false },
        data: { isRead: true },
      });
      expect(result).toEqual({ count: 5 });
    });

    it('should return count 0 when no unread alerts exist', async () => {
      prisma.alert.updateMany.mockResolvedValue({ count: 0 });

      const result = await alertService.markAllAsRead(userId);

      expect(result).toEqual({ count: 0 });
    });
  });

  describe('getUnreadCount', () => {
    it('should return the count of unread alerts', async () => {
      prisma.alert.count.mockResolvedValue(7);

      const result = await alertService.getUnreadCount(userId);

      expect(prisma.alert.count).toHaveBeenCalledWith({
        where: { userId, isRead: false },
      });
      expect(result).toEqual({ count: 7 });
    });

    it('should return 0 when there are no unread alerts', async () => {
      prisma.alert.count.mockResolvedValue(0);

      const result = await alertService.getUnreadCount(userId);

      expect(result).toEqual({ count: 0 });
    });
  });
});
