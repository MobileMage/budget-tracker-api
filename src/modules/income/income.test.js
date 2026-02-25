const express = require('express');
const request = require('supertest');

// ---------------------------------------------------------------------------
// Mocks — must be declared before requiring the modules under test
// ---------------------------------------------------------------------------

const mockPrisma = {
  income: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    aggregate: jest.fn(),
  },
};

jest.mock('../../config/database', () => mockPrisma);

jest.mock('../../middleware/authenticate', () => {
  return (req, _res, next) => {
    req.user = { id: 'user-1', email: 'test@example.com' };
    next();
  };
});

// ---------------------------------------------------------------------------
// App setup
// ---------------------------------------------------------------------------

const incomeRoutes = require('./income.routes');
const errorHandler = require('../../middleware/errorHandler');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/income', incomeRoutes);
  app.use(errorHandler);
  return app;
}

const app = createApp();

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const sampleIncome = {
  id: 'income-1',
  userId: 'user-1',
  amount: 2500,
  source: 'Part-time job',
  date: new Date('2026-02-01T00:00:00.000Z'),
  notes: 'February salary',
  createdAt: new Date('2026-02-01T12:00:00.000Z'),
  updatedAt: new Date('2026-02-01T12:00:00.000Z'),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Income Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // POST /api/income
  // -------------------------------------------------------------------------
  describe('POST /api/income', () => {
    it('should create a new income record', async () => {
      mockPrisma.income.create.mockResolvedValue(sampleIncome);

      const res = await request(app)
        .post('/api/income')
        .send({
          amount: 2500,
          source: 'Part-time job',
          date: '2026-02-01T00:00:00.000Z',
          notes: 'February salary',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Income created successfully');
      expect(res.body.data).toBeDefined();
      expect(mockPrisma.income.create).toHaveBeenCalledTimes(1);
    });

    it('should return 400 when amount is missing', async () => {
      const res = await request(app)
        .post('/api/income')
        .send({
          source: 'Part-time job',
          date: '2026-02-01T00:00:00.000Z',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 when amount is negative', async () => {
      const res = await request(app)
        .post('/api/income')
        .send({
          amount: -100,
          source: 'Part-time job',
          date: '2026-02-01T00:00:00.000Z',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 when source is missing', async () => {
      const res = await request(app)
        .post('/api/income')
        .send({
          amount: 2500,
          date: '2026-02-01T00:00:00.000Z',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 when date is invalid', async () => {
      const res = await request(app)
        .post('/api/income')
        .send({
          amount: 2500,
          source: 'Part-time job',
          date: 'not-a-date',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should create income without optional notes', async () => {
      const incomeWithoutNotes = { ...sampleIncome, notes: null };
      mockPrisma.income.create.mockResolvedValue(incomeWithoutNotes);

      const res = await request(app)
        .post('/api/income')
        .send({
          amount: 2500,
          source: 'Part-time job',
          date: '2026-02-01T00:00:00.000Z',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // GET /api/income
  // -------------------------------------------------------------------------
  describe('GET /api/income', () => {
    it('should return a paginated list of incomes', async () => {
      mockPrisma.income.findMany.mockResolvedValue([sampleIncome]);
      mockPrisma.income.count.mockResolvedValue(1);

      const res = await request(app).get('/api/income');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.incomes).toHaveLength(1);
      expect(res.body.data.total).toBe(1);
      expect(res.body.data.page).toBe(1);
      expect(res.body.data.totalPages).toBe(1);
    });

    it('should support pagination parameters', async () => {
      mockPrisma.income.findMany.mockResolvedValue([]);
      mockPrisma.income.count.mockResolvedValue(25);

      const res = await request(app).get('/api/income?page=2&limit=5');

      expect(res.status).toBe(200);
      expect(res.body.data.page).toBe(2);
      expect(res.body.data.totalPages).toBe(5);
      expect(mockPrisma.income.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 5, take: 5 })
      );
    });

    it('should support date range filtering', async () => {
      mockPrisma.income.findMany.mockResolvedValue([sampleIncome]);
      mockPrisma.income.count.mockResolvedValue(1);

      const res = await request(app).get(
        '/api/income?startDate=2026-01-01&endDate=2026-02-28'
      );

      expect(res.status).toBe(200);
      expect(mockPrisma.income.findMany).toHaveBeenCalledWith(
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

    it('should return empty list when no incomes exist', async () => {
      mockPrisma.income.findMany.mockResolvedValue([]);
      mockPrisma.income.count.mockResolvedValue(0);

      const res = await request(app).get('/api/income');

      expect(res.status).toBe(200);
      expect(res.body.data.incomes).toHaveLength(0);
      expect(res.body.data.total).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // GET /api/income/total
  // -------------------------------------------------------------------------
  describe('GET /api/income/total', () => {
    it('should return the total income for a period', async () => {
      mockPrisma.income.aggregate.mockResolvedValue({
        _sum: { amount: 5000 },
      });

      const res = await request(app).get(
        '/api/income/total?startDate=2026-01-01&endDate=2026-02-28'
      );

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.total).toBe(5000);
    });

    it('should return 0 when there are no incomes in the period', async () => {
      mockPrisma.income.aggregate.mockResolvedValue({
        _sum: { amount: null },
      });

      const res = await request(app).get(
        '/api/income/total?startDate=2026-01-01&endDate=2026-02-28'
      );

      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(0);
    });

    it('should return 400 when startDate is missing', async () => {
      const res = await request(app).get('/api/income/total?endDate=2026-02-28');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 when endDate is missing', async () => {
      const res = await request(app).get(
        '/api/income/total?startDate=2026-01-01'
      );

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 when dates are invalid', async () => {
      const res = await request(app).get(
        '/api/income/total?startDate=bad&endDate=bad'
      );

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // GET /api/income/:id
  // -------------------------------------------------------------------------
  describe('GET /api/income/:id', () => {
    it('should return a single income record', async () => {
      mockPrisma.income.findUnique.mockResolvedValue(sampleIncome);

      const res = await request(app).get('/api/income/income-1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('income-1');
    });

    it('should return 404 when income is not found', async () => {
      mockPrisma.income.findUnique.mockResolvedValue(null);

      const res = await request(app).get('/api/income/nonexistent');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Income not found');
    });

    it('should return 404 when income belongs to another user', async () => {
      mockPrisma.income.findUnique.mockResolvedValue({
        ...sampleIncome,
        userId: 'other-user',
      });

      const res = await request(app).get('/api/income/income-1');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // PATCH /api/income/:id
  // -------------------------------------------------------------------------
  describe('PATCH /api/income/:id', () => {
    it('should update an income record', async () => {
      const updatedIncome = { ...sampleIncome, amount: 3000 };
      mockPrisma.income.findUnique.mockResolvedValue(sampleIncome);
      mockPrisma.income.update.mockResolvedValue(updatedIncome);

      const res = await request(app)
        .patch('/api/income/income-1')
        .send({ amount: 3000 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Income updated successfully');
    });

    it('should return 404 when income to update is not found', async () => {
      mockPrisma.income.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .patch('/api/income/nonexistent')
        .send({ amount: 3000 });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should return 404 when trying to update another user income', async () => {
      mockPrisma.income.findUnique.mockResolvedValue({
        ...sampleIncome,
        userId: 'other-user',
      });

      const res = await request(app)
        .patch('/api/income/income-1')
        .send({ amount: 3000 });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 for invalid update data', async () => {
      const res = await request(app)
        .patch('/api/income/income-1')
        .send({ amount: -500 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should allow partial updates', async () => {
      mockPrisma.income.findUnique.mockResolvedValue(sampleIncome);
      mockPrisma.income.update.mockResolvedValue({
        ...sampleIncome,
        source: 'Freelance',
      });

      const res = await request(app)
        .patch('/api/income/income-1')
        .send({ source: 'Freelance' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // DELETE /api/income/:id
  // -------------------------------------------------------------------------
  describe('DELETE /api/income/:id', () => {
    it('should delete an income record', async () => {
      mockPrisma.income.findUnique.mockResolvedValue(sampleIncome);
      mockPrisma.income.delete.mockResolvedValue(sampleIncome);

      const res = await request(app).delete('/api/income/income-1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Income deleted successfully');
    });

    it('should return 404 when income to delete is not found', async () => {
      mockPrisma.income.findUnique.mockResolvedValue(null);

      const res = await request(app).delete('/api/income/nonexistent');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should return 404 when trying to delete another user income', async () => {
      mockPrisma.income.findUnique.mockResolvedValue({
        ...sampleIncome,
        userId: 'other-user',
      });

      const res = await request(app).delete('/api/income/income-1');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});
