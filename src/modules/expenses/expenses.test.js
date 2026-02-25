const express = require('express');
const request = require('supertest');

// ---------------------------------------------------------------------------
// Mocks — must be declared before requiring the modules under test
// ---------------------------------------------------------------------------

const mockPrisma = {
  expense: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn(),
  },
};

jest.mock('../../config/database', () => mockPrisma);

jest.mock('../../middleware/authenticate', () => {
  return (req, _res, next) => {
    req.user = { id: 'user-1', email: 'test@example.com' };
    next();
  };
});

jest.mock('../alerts/alerts.service', () => ({
  checkOverspending: jest.fn().mockResolvedValue(null),
  checkImpulseSpending: jest.fn().mockResolvedValue(null),
}));

// ---------------------------------------------------------------------------
// App setup
// ---------------------------------------------------------------------------

const expensesRoutes = require('./expenses.routes');
const errorHandler = require('../../middleware/errorHandler');
const alertsService = require('../alerts/alerts.service');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/expenses', expensesRoutes);
  app.use(errorHandler);
  return app;
}

const app = createApp();

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const sampleExpense = {
  id: 'expense-1',
  userId: 'user-1',
  amount: 45.5,
  category: 'FOOD',
  date: new Date('2026-02-20T12:30:00.000Z'),
  notes: 'Lunch at the cafeteria',
  isImpulse: false,
  createdAt: new Date('2026-02-20T12:30:00.000Z'),
  updatedAt: new Date('2026-02-20T12:30:00.000Z'),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Expenses Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // POST /api/expenses
  // -------------------------------------------------------------------------
  describe('POST /api/expenses', () => {
    it('should create a new expense record', async () => {
      mockPrisma.expense.create.mockResolvedValue(sampleExpense);

      const res = await request(app)
        .post('/api/expenses')
        .send({
          amount: 45.5,
          category: 'FOOD',
          date: '2026-02-20T12:30:00.000Z',
          notes: 'Lunch at the cafeteria',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Expense created successfully');
      expect(res.body.data).toBeDefined();
      expect(mockPrisma.expense.create).toHaveBeenCalledTimes(1);
    });

    it('should trigger alert checks after creation', async () => {
      mockPrisma.expense.create.mockResolvedValue(sampleExpense);

      await request(app)
        .post('/api/expenses')
        .send({
          amount: 45.5,
          category: 'FOOD',
          date: '2026-02-20T12:30:00.000Z',
        });

      expect(alertsService.checkOverspending).toHaveBeenCalledWith('user-1', sampleExpense);
      expect(alertsService.checkImpulseSpending).toHaveBeenCalledWith('user-1', sampleExpense);
    });

    it('should still create the expense when alert checks fail', async () => {
      mockPrisma.expense.create.mockResolvedValue(sampleExpense);
      alertsService.checkOverspending.mockRejectedValue(new Error('Alert service down'));

      const res = await request(app)
        .post('/api/expenses')
        .send({
          amount: 45.5,
          category: 'FOOD',
          date: '2026-02-20T12:30:00.000Z',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 when amount is missing', async () => {
      const res = await request(app)
        .post('/api/expenses')
        .send({
          category: 'FOOD',
          date: '2026-02-20T12:30:00.000Z',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 when amount is negative', async () => {
      const res = await request(app)
        .post('/api/expenses')
        .send({
          amount: -10,
          category: 'FOOD',
          date: '2026-02-20T12:30:00.000Z',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 when category is invalid', async () => {
      const res = await request(app)
        .post('/api/expenses')
        .send({
          amount: 45.5,
          category: 'INVALID_CATEGORY',
          date: '2026-02-20T12:30:00.000Z',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 when category is missing', async () => {
      const res = await request(app)
        .post('/api/expenses')
        .send({
          amount: 45.5,
          date: '2026-02-20T12:30:00.000Z',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 when date is invalid', async () => {
      const res = await request(app)
        .post('/api/expenses')
        .send({
          amount: 45.5,
          category: 'FOOD',
          date: 'not-a-date',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should create expense without optional notes', async () => {
      const expenseWithoutNotes = { ...sampleExpense, notes: null };
      mockPrisma.expense.create.mockResolvedValue(expenseWithoutNotes);

      const res = await request(app)
        .post('/api/expenses')
        .send({
          amount: 45.5,
          category: 'FOOD',
          date: '2026-02-20T12:30:00.000Z',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // GET /api/expenses
  // -------------------------------------------------------------------------
  describe('GET /api/expenses', () => {
    it('should return a paginated list of expenses', async () => {
      mockPrisma.expense.findMany.mockResolvedValue([sampleExpense]);
      mockPrisma.expense.count.mockResolvedValue(1);

      const res = await request(app).get('/api/expenses');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.expenses).toHaveLength(1);
      expect(res.body.data.total).toBe(1);
      expect(res.body.data.page).toBe(1);
      expect(res.body.data.totalPages).toBe(1);
    });

    it('should support pagination parameters', async () => {
      mockPrisma.expense.findMany.mockResolvedValue([]);
      mockPrisma.expense.count.mockResolvedValue(50);

      const res = await request(app).get('/api/expenses?page=3&limit=5');

      expect(res.status).toBe(200);
      expect(res.body.data.page).toBe(3);
      expect(res.body.data.totalPages).toBe(10);
      expect(mockPrisma.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 5 })
      );
    });

    it('should support date range filtering', async () => {
      mockPrisma.expense.findMany.mockResolvedValue([sampleExpense]);
      mockPrisma.expense.count.mockResolvedValue(1);

      const res = await request(app).get(
        '/api/expenses?startDate=2026-02-01&endDate=2026-02-28'
      );

      expect(res.status).toBe(200);
      expect(mockPrisma.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
            date: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        })
      );
    });

    it('should support category filtering', async () => {
      mockPrisma.expense.findMany.mockResolvedValue([sampleExpense]);
      mockPrisma.expense.count.mockResolvedValue(1);

      const res = await request(app).get('/api/expenses?category=FOOD');

      expect(res.status).toBe(200);
      expect(mockPrisma.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
            category: 'FOOD',
          }),
        })
      );
    });

    it('should support sorting parameters', async () => {
      mockPrisma.expense.findMany.mockResolvedValue([sampleExpense]);
      mockPrisma.expense.count.mockResolvedValue(1);

      const res = await request(app).get(
        '/api/expenses?sortBy=amount&sortOrder=asc'
      );

      expect(res.status).toBe(200);
      expect(mockPrisma.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { amount: 'asc' },
        })
      );
    });

    it('should return empty list when no expenses exist', async () => {
      mockPrisma.expense.findMany.mockResolvedValue([]);
      mockPrisma.expense.count.mockResolvedValue(0);

      const res = await request(app).get('/api/expenses');

      expect(res.status).toBe(200);
      expect(res.body.data.expenses).toHaveLength(0);
      expect(res.body.data.total).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // GET /api/expenses/by-category
  // -------------------------------------------------------------------------
  describe('GET /api/expenses/by-category', () => {
    it('should return expenses grouped by category', async () => {
      mockPrisma.expense.groupBy.mockResolvedValue([
        { category: 'FOOD', _sum: { amount: 350 } },
        { category: 'TRANSPORT', _sum: { amount: 120 } },
      ]);

      const res = await request(app).get(
        '/api/expenses/by-category?startDate=2026-02-01&endDate=2026-02-28'
      );

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].category).toBe('FOOD');
      expect(res.body.data[0].total).toBe(350);
      expect(res.body.data[1].category).toBe('TRANSPORT');
      expect(res.body.data[1].total).toBe(120);
    });

    it('should return 400 when startDate is missing', async () => {
      const res = await request(app).get(
        '/api/expenses/by-category?endDate=2026-02-28'
      );

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 when endDate is missing', async () => {
      const res = await request(app).get(
        '/api/expenses/by-category?startDate=2026-02-01'
      );

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 when dates are invalid', async () => {
      const res = await request(app).get(
        '/api/expenses/by-category?startDate=bad&endDate=bad'
      );

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return empty array when no expenses in period', async () => {
      mockPrisma.expense.groupBy.mockResolvedValue([]);

      const res = await request(app).get(
        '/api/expenses/by-category?startDate=2026-02-01&endDate=2026-02-28'
      );

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // GET /api/expenses/total
  // -------------------------------------------------------------------------
  describe('GET /api/expenses/total', () => {
    it('should return the total expenses for a period', async () => {
      mockPrisma.expense.aggregate.mockResolvedValue({
        _sum: { amount: 1250.75 },
      });

      const res = await request(app).get(
        '/api/expenses/total?startDate=2026-02-01&endDate=2026-02-28'
      );

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.total).toBe(1250.75);
    });

    it('should return 0 when there are no expenses in the period', async () => {
      mockPrisma.expense.aggregate.mockResolvedValue({
        _sum: { amount: null },
      });

      const res = await request(app).get(
        '/api/expenses/total?startDate=2026-02-01&endDate=2026-02-28'
      );

      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(0);
    });

    it('should return 400 when startDate is missing', async () => {
      const res = await request(app).get(
        '/api/expenses/total?endDate=2026-02-28'
      );

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 when endDate is missing', async () => {
      const res = await request(app).get(
        '/api/expenses/total?startDate=2026-02-01'
      );

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 when dates are invalid', async () => {
      const res = await request(app).get(
        '/api/expenses/total?startDate=bad&endDate=bad'
      );

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // GET /api/expenses/:id
  // -------------------------------------------------------------------------
  describe('GET /api/expenses/:id', () => {
    it('should return a single expense record', async () => {
      mockPrisma.expense.findUnique.mockResolvedValue(sampleExpense);

      const res = await request(app).get('/api/expenses/expense-1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('expense-1');
    });

    it('should return 404 when expense is not found', async () => {
      mockPrisma.expense.findUnique.mockResolvedValue(null);

      const res = await request(app).get('/api/expenses/nonexistent');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Expense not found');
    });

    it('should return 404 when expense belongs to another user', async () => {
      mockPrisma.expense.findUnique.mockResolvedValue({
        ...sampleExpense,
        userId: 'other-user',
      });

      const res = await request(app).get('/api/expenses/expense-1');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // PATCH /api/expenses/:id
  // -------------------------------------------------------------------------
  describe('PATCH /api/expenses/:id', () => {
    it('should update an expense record', async () => {
      const updatedExpense = { ...sampleExpense, amount: 55 };
      mockPrisma.expense.findUnique.mockResolvedValue(sampleExpense);
      mockPrisma.expense.update.mockResolvedValue(updatedExpense);

      const res = await request(app)
        .patch('/api/expenses/expense-1')
        .send({ amount: 55 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Expense updated successfully');
    });

    it('should return 404 when expense to update is not found', async () => {
      mockPrisma.expense.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .patch('/api/expenses/nonexistent')
        .send({ amount: 55 });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should return 404 when trying to update another user expense', async () => {
      mockPrisma.expense.findUnique.mockResolvedValue({
        ...sampleExpense,
        userId: 'other-user',
      });

      const res = await request(app)
        .patch('/api/expenses/expense-1')
        .send({ amount: 55 });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 for invalid update data', async () => {
      const res = await request(app)
        .patch('/api/expenses/expense-1')
        .send({ amount: -500 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 for invalid category in update', async () => {
      const res = await request(app)
        .patch('/api/expenses/expense-1')
        .send({ category: 'INVALID' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should allow partial updates', async () => {
      mockPrisma.expense.findUnique.mockResolvedValue(sampleExpense);
      mockPrisma.expense.update.mockResolvedValue({
        ...sampleExpense,
        category: 'TRANSPORT',
      });

      const res = await request(app)
        .patch('/api/expenses/expense-1')
        .send({ category: 'TRANSPORT' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // DELETE /api/expenses/:id
  // -------------------------------------------------------------------------
  describe('DELETE /api/expenses/:id', () => {
    it('should delete an expense record', async () => {
      mockPrisma.expense.findUnique.mockResolvedValue(sampleExpense);
      mockPrisma.expense.delete.mockResolvedValue(sampleExpense);

      const res = await request(app).delete('/api/expenses/expense-1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Expense deleted successfully');
    });

    it('should return 404 when expense to delete is not found', async () => {
      mockPrisma.expense.findUnique.mockResolvedValue(null);

      const res = await request(app).delete('/api/expenses/nonexistent');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should return 404 when trying to delete another user expense', async () => {
      mockPrisma.expense.findUnique.mockResolvedValue({
        ...sampleExpense,
        userId: 'other-user',
      });

      const res = await request(app).delete('/api/expenses/expense-1');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});
