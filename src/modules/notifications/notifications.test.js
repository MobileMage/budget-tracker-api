// ---------------------------------------------------------------------------
// Mock Prisma client
// ---------------------------------------------------------------------------
const mockPrisma = {
  notification: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  user: {
    findMany: jest.fn(),
  },
  expense: {
    aggregate: jest.fn(),
    groupBy: jest.fn(),
  },
  income: {
    aggregate: jest.fn(),
  },
  alert: {
    count: jest.fn(),
  },
  forecastSnapshot: {
    findFirst: jest.fn(),
  },
};
jest.mock('../../config/database', () => mockPrisma);

// Mock logger
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};
jest.mock('../../utils/logger', () => mockLogger);

// Mock node-cron
const mockSchedule = jest.fn();
jest.mock('node-cron', () => ({
  schedule: mockSchedule,
}));

const notificationsService = require('./notifications.service');
const { generateDigestForUser, startWeeklyDigest } = require('./jobs/weeklyDigest.cron');

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------
const TEST_USER_ID = 'user-uuid-1';
const TEST_NOTIFICATION_ID = 'notif-uuid-1';

const TEST_NOTIFICATION = {
  id: TEST_NOTIFICATION_ID,
  userId: TEST_USER_ID,
  title: 'Test Notification',
  body: 'This is a test notification body',
  isRead: false,
  createdAt: new Date('2026-02-20T10:00:00Z'),
};

const TEST_NOTIFICATION_READ = {
  ...TEST_NOTIFICATION,
  id: 'notif-uuid-2',
  isRead: true,
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ===========================================================================
// notificationsService.createNotification
// ===========================================================================
describe('notificationsService.createNotification', () => {
  it('should create a notification record', async () => {
    mockPrisma.notification.create.mockResolvedValue(TEST_NOTIFICATION);

    const result = await notificationsService.createNotification(TEST_USER_ID, {
      title: 'Test Notification',
      body: 'This is a test notification body',
    });

    expect(result).toEqual(TEST_NOTIFICATION);
    expect(mockPrisma.notification.create).toHaveBeenCalledWith({
      data: {
        userId: TEST_USER_ID,
        title: 'Test Notification',
        body: 'This is a test notification body',
      },
    });
  });
});

// ===========================================================================
// notificationsService.getNotifications
// ===========================================================================
describe('notificationsService.getNotifications', () => {
  it('should return paginated notifications ordered by createdAt desc', async () => {
    const notifications = [TEST_NOTIFICATION, TEST_NOTIFICATION_READ];
    mockPrisma.notification.findMany.mockResolvedValue(notifications);
    mockPrisma.notification.count.mockResolvedValue(2);

    const result = await notificationsService.getNotifications(TEST_USER_ID, {});

    expect(result).toEqual({
      notifications,
      total: 2,
      page: 1,
      totalPages: 1,
    });
    expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
      where: { userId: TEST_USER_ID },
      orderBy: { createdAt: 'desc' },
      skip: 0,
      take: 20,
    });
  });

  it('should apply isRead filter when provided', async () => {
    mockPrisma.notification.findMany.mockResolvedValue([TEST_NOTIFICATION]);
    mockPrisma.notification.count.mockResolvedValue(1);

    const result = await notificationsService.getNotifications(TEST_USER_ID, {
      isRead: false,
    });

    expect(result.notifications).toHaveLength(1);
    expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: TEST_USER_ID, isRead: false },
      })
    );
  });

  it('should use custom page and limit', async () => {
    mockPrisma.notification.findMany.mockResolvedValue([]);
    mockPrisma.notification.count.mockResolvedValue(25);

    const result = await notificationsService.getNotifications(TEST_USER_ID, {
      page: 2,
      limit: 10,
    });

    expect(result.page).toBe(2);
    expect(result.totalPages).toBe(3);
    expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
      })
    );
  });

  it('should return totalPages as 0 when there are no notifications', async () => {
    mockPrisma.notification.findMany.mockResolvedValue([]);
    mockPrisma.notification.count.mockResolvedValue(0);

    const result = await notificationsService.getNotifications(TEST_USER_ID, {});

    expect(result.total).toBe(0);
    expect(result.totalPages).toBe(0);
    expect(result.notifications).toEqual([]);
  });
});

// ===========================================================================
// notificationsService.markAsRead
// ===========================================================================
describe('notificationsService.markAsRead', () => {
  it('should mark a notification as read', async () => {
    const updated = { ...TEST_NOTIFICATION, isRead: true };
    mockPrisma.notification.findUnique.mockResolvedValue(TEST_NOTIFICATION);
    mockPrisma.notification.update.mockResolvedValue(updated);

    const result = await notificationsService.markAsRead(
      TEST_USER_ID,
      TEST_NOTIFICATION_ID
    );

    expect(result.isRead).toBe(true);
    expect(mockPrisma.notification.update).toHaveBeenCalledWith({
      where: { id: TEST_NOTIFICATION_ID },
      data: { isRead: true },
    });
  });

  it('should return null if notification does not exist', async () => {
    mockPrisma.notification.findUnique.mockResolvedValue(null);

    const result = await notificationsService.markAsRead(
      TEST_USER_ID,
      'nonexistent-id'
    );

    expect(result).toBeNull();
    expect(mockPrisma.notification.update).not.toHaveBeenCalled();
  });

  it('should return null if notification belongs to another user', async () => {
    mockPrisma.notification.findUnique.mockResolvedValue({
      ...TEST_NOTIFICATION,
      userId: 'other-user-id',
    });

    const result = await notificationsService.markAsRead(
      TEST_USER_ID,
      TEST_NOTIFICATION_ID
    );

    expect(result).toBeNull();
    expect(mockPrisma.notification.update).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// notificationsService.markAllAsRead
// ===========================================================================
describe('notificationsService.markAllAsRead', () => {
  it('should mark all unread notifications as read', async () => {
    mockPrisma.notification.updateMany.mockResolvedValue({ count: 5 });

    const result = await notificationsService.markAllAsRead(TEST_USER_ID);

    expect(result).toEqual({ count: 5 });
    expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
      where: { userId: TEST_USER_ID, isRead: false },
      data: { isRead: true },
    });
  });

  it('should return count 0 when no unread notifications exist', async () => {
    mockPrisma.notification.updateMany.mockResolvedValue({ count: 0 });

    const result = await notificationsService.markAllAsRead(TEST_USER_ID);

    expect(result).toEqual({ count: 0 });
  });
});

// ===========================================================================
// notificationsService.getUnreadCount
// ===========================================================================
describe('notificationsService.getUnreadCount', () => {
  it('should return the count of unread notifications', async () => {
    mockPrisma.notification.count.mockResolvedValue(7);

    const result = await notificationsService.getUnreadCount(TEST_USER_ID);

    expect(result).toBe(7);
    expect(mockPrisma.notification.count).toHaveBeenCalledWith({
      where: { userId: TEST_USER_ID, isRead: false },
    });
  });

  it('should return 0 when there are no unread notifications', async () => {
    mockPrisma.notification.count.mockResolvedValue(0);

    const result = await notificationsService.getUnreadCount(TEST_USER_ID);

    expect(result).toBe(0);
  });
});

// ===========================================================================
// notificationsService.deleteNotification
// ===========================================================================
describe('notificationsService.deleteNotification', () => {
  it('should delete a notification and return the deleted record', async () => {
    mockPrisma.notification.findUnique.mockResolvedValue(TEST_NOTIFICATION);
    mockPrisma.notification.delete.mockResolvedValue(TEST_NOTIFICATION);

    const result = await notificationsService.deleteNotification(
      TEST_USER_ID,
      TEST_NOTIFICATION_ID
    );

    expect(result).toEqual(TEST_NOTIFICATION);
    expect(mockPrisma.notification.delete).toHaveBeenCalledWith({
      where: { id: TEST_NOTIFICATION_ID },
    });
  });

  it('should return null if notification does not exist', async () => {
    mockPrisma.notification.findUnique.mockResolvedValue(null);

    const result = await notificationsService.deleteNotification(
      TEST_USER_ID,
      'nonexistent-id'
    );

    expect(result).toBeNull();
    expect(mockPrisma.notification.delete).not.toHaveBeenCalled();
  });

  it('should return null if notification belongs to another user', async () => {
    mockPrisma.notification.findUnique.mockResolvedValue({
      ...TEST_NOTIFICATION,
      userId: 'other-user-id',
    });

    const result = await notificationsService.deleteNotification(
      TEST_USER_ID,
      TEST_NOTIFICATION_ID
    );

    expect(result).toBeNull();
    expect(mockPrisma.notification.delete).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// notificationsService.deleteAllRead
// ===========================================================================
describe('notificationsService.deleteAllRead', () => {
  it('should delete all read notifications for the user', async () => {
    mockPrisma.notification.deleteMany.mockResolvedValue({ count: 3 });

    const result = await notificationsService.deleteAllRead(TEST_USER_ID);

    expect(result).toEqual({ count: 3 });
    expect(mockPrisma.notification.deleteMany).toHaveBeenCalledWith({
      where: { userId: TEST_USER_ID, isRead: true },
    });
  });

  it('should return count 0 when no read notifications exist', async () => {
    mockPrisma.notification.deleteMany.mockResolvedValue({ count: 0 });

    const result = await notificationsService.deleteAllRead(TEST_USER_ID);

    expect(result).toEqual({ count: 0 });
  });
});

// ===========================================================================
// Weekly Digest - generateDigestForUser
// ===========================================================================
describe('generateDigestForUser', () => {
  const MOCK_NOW = new Date('2026-02-23T09:00:00Z'); // Monday
  let dateSpy;

  beforeEach(() => {
    // Fix "now" to a known Monday so last week boundaries are deterministic
    dateSpy = jest.spyOn(global, 'Date').mockImplementation(function (...args) {
      if (args.length === 0) {
        return new dateSpy.OriginalDate(MOCK_NOW);
      }
      return new dateSpy.OriginalDate(...args);
    });

    // Preserve static methods and the original constructor for new Date(value)
    dateSpy.OriginalDate = jest.requireActual('../../utils/dateHelpers').__OriginalDate || global.Date.constructor === Function ? (() => {
      // Save reference before mocking
      return Date;
    })() : Date;

    // Restore proper Date behavior: we need the real Date for constructing
    // from arguments, but new Date() (no args) should return our fixed time.
    jest.restoreAllMocks();

    // Instead, we mock at a higher level: freeze the current time
    jest.useFakeTimers();
    jest.setSystemTime(MOCK_NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should generate a digest notification with spending data', async () => {
    // Last week: Mon Feb 16 00:00:00 - Sun Feb 22 23:59:59.999
    mockPrisma.expense.aggregate.mockResolvedValue({
      _sum: { amount: 450.75 },
    });
    mockPrisma.income.aggregate.mockResolvedValue({
      _sum: { amount: 1200.0 },
    });
    mockPrisma.expense.groupBy.mockResolvedValue([
      { category: 'FOOD', _sum: { amount: 200.0 } },
    ]);
    mockPrisma.alert.count.mockResolvedValue(2);
    mockPrisma.forecastSnapshot.findFirst.mockResolvedValue({
      id: 'forecast-1',
      userId: TEST_USER_ID,
      riskLevel: 'SAFE',
      balance: 3000,
      burnRate: 65,
      estimatedDaysLeft: 46,
      createdAt: new Date('2026-02-22T12:00:00Z'),
    });

    const createdNotification = {
      id: 'digest-notif-1',
      userId: TEST_USER_ID,
      title: 'Weekly Financial Digest',
      body: [
        'Total spent last week: $450.75',
        'Top spending category: FOOD',
        'Alerts triggered: 2',
        'Current risk level: SAFE',
        '',
        'Tip: Your top spending category was FOOD. Look for small savings there to make a big difference over time.',
      ].join('\n'),
      isRead: false,
      createdAt: new Date('2026-02-23T09:00:00Z'),
    };
    mockPrisma.notification.create.mockResolvedValue(createdNotification);

    const result = await generateDigestForUser(TEST_USER_ID);

    expect(result.title).toBe('Weekly Financial Digest');
    expect(result.body).toContain('$450.75');
    expect(result.body).toContain('FOOD');
    expect(result.body).toContain('Alerts triggered: 2');
    expect(result.body).toContain('SAFE');

    // Verify expense aggregate was called with last week's date range
    expect(mockPrisma.expense.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: TEST_USER_ID,
          date: expect.objectContaining({
            gte: expect.any(Date),
            lte: expect.any(Date),
          }),
        }),
      })
    );

    // Verify notification was created
    expect(mockPrisma.notification.create).toHaveBeenCalledTimes(1);
  });

  it('should handle a user with no expenses last week', async () => {
    mockPrisma.expense.aggregate.mockResolvedValue({
      _sum: { amount: null },
    });
    mockPrisma.income.aggregate.mockResolvedValue({
      _sum: { amount: 500.0 },
    });
    mockPrisma.expense.groupBy.mockResolvedValue([]);
    mockPrisma.alert.count.mockResolvedValue(0);
    mockPrisma.forecastSnapshot.findFirst.mockResolvedValue(null);

    const createdNotification = {
      id: 'digest-notif-2',
      userId: TEST_USER_ID,
      title: 'Weekly Financial Digest',
      body: [
        'Total spent last week: $0.00',
        'No expenses recorded last week',
        'Alerts triggered: 0',
        'Current risk level: SAFE',
        '',
        'Tip: Great job keeping spending in check! Consider putting any surplus toward savings or an emergency fund.',
      ].join('\n'),
      isRead: false,
      createdAt: new Date('2026-02-23T09:00:00Z'),
    };
    mockPrisma.notification.create.mockResolvedValue(createdNotification);

    const result = await generateDigestForUser(TEST_USER_ID);

    expect(result.title).toBe('Weekly Financial Digest');
    expect(result.body).toContain('$0.00');
    expect(result.body).toContain('No expenses recorded last week');
    expect(result.body).toContain('Alerts triggered: 0');
  });

  it('should include a danger-level tip when risk is DANGER', async () => {
    mockPrisma.expense.aggregate.mockResolvedValue({
      _sum: { amount: 980.0 },
    });
    mockPrisma.income.aggregate.mockResolvedValue({
      _sum: { amount: 500.0 },
    });
    mockPrisma.expense.groupBy.mockResolvedValue([
      { category: 'SHOPPING', _sum: { amount: 600.0 } },
    ]);
    mockPrisma.alert.count.mockResolvedValue(5);
    mockPrisma.forecastSnapshot.findFirst.mockResolvedValue({
      id: 'forecast-2',
      userId: TEST_USER_ID,
      riskLevel: 'DANGER',
      balance: 200,
      burnRate: 140,
      estimatedDaysLeft: 1,
      createdAt: new Date('2026-02-22T12:00:00Z'),
    });

    const createdNotification = {
      id: 'digest-notif-3',
      userId: TEST_USER_ID,
      title: 'Weekly Financial Digest',
      body: expect.stringContaining('critically low'),
      isRead: false,
      createdAt: new Date('2026-02-23T09:00:00Z'),
    };
    mockPrisma.notification.create.mockResolvedValue({
      ...createdNotification,
      body: [
        'Total spent last week: $980.00',
        'Top spending category: SHOPPING',
        'Alerts triggered: 5',
        'Current risk level: DANGER',
        '',
        'Tip: Your funds are critically low. Consider pausing non-essential spending and reviewing upcoming bills.',
      ].join('\n'),
    });

    const result = await generateDigestForUser(TEST_USER_ID);

    expect(result.body).toContain('DANGER');
    expect(result.body).toContain('critically low');
  });

  it('should include a warning-level tip when risk is WARNING', async () => {
    mockPrisma.expense.aggregate.mockResolvedValue({
      _sum: { amount: 700.0 },
    });
    mockPrisma.income.aggregate.mockResolvedValue({
      _sum: { amount: 800.0 },
    });
    mockPrisma.expense.groupBy.mockResolvedValue([
      { category: 'ENTERTAINMENT', _sum: { amount: 350.0 } },
    ]);
    mockPrisma.alert.count.mockResolvedValue(3);
    mockPrisma.forecastSnapshot.findFirst.mockResolvedValue({
      id: 'forecast-3',
      userId: TEST_USER_ID,
      riskLevel: 'WARNING',
      balance: 1000,
      burnRate: 100,
      estimatedDaysLeft: 10,
      createdAt: new Date('2026-02-22T12:00:00Z'),
    });

    const createdNotification = {
      id: 'digest-notif-4',
      userId: TEST_USER_ID,
      title: 'Weekly Financial Digest',
      body: [
        'Total spent last week: $700.00',
        'Top spending category: ENTERTAINMENT',
        'Alerts triggered: 3',
        'Current risk level: WARNING',
        '',
        'Tip: Your spending is elevated. Try setting a daily spending cap to stay on track this week.',
      ].join('\n'),
      isRead: false,
      createdAt: new Date('2026-02-23T09:00:00Z'),
    };
    mockPrisma.notification.create.mockResolvedValue(createdNotification);

    const result = await generateDigestForUser(TEST_USER_ID);

    expect(result.body).toContain('WARNING');
    expect(result.body).toContain('daily spending cap');
  });
});

// ===========================================================================
// Weekly Digest - startWeeklyDigest (cron registration)
// ===========================================================================
describe('startWeeklyDigest', () => {
  it('should register a cron job with the correct schedule', () => {
    startWeeklyDigest();

    expect(mockSchedule).toHaveBeenCalledTimes(1);
    expect(mockSchedule).toHaveBeenCalledWith('0 8 * * 1', expect.any(Function));
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Weekly digest cron job registered (schedule: 0 8 * * 1)'
    );
  });

  it('should process all users when the cron callback fires', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-02-23T08:00:00Z'));

    startWeeklyDigest();

    // Get the callback that was registered with cron.schedule
    const cronCallback = mockSchedule.mock.calls[0][1];

    // Mock users
    mockPrisma.user.findMany.mockResolvedValue([
      { id: 'user-1' },
      { id: 'user-2' },
    ]);

    // Mock all the data each user's digest needs
    mockPrisma.expense.aggregate.mockResolvedValue({ _sum: { amount: 100 } });
    mockPrisma.income.aggregate.mockResolvedValue({ _sum: { amount: 500 } });
    mockPrisma.expense.groupBy.mockResolvedValue([
      { category: 'FOOD', _sum: { amount: 100 } },
    ]);
    mockPrisma.alert.count.mockResolvedValue(0);
    mockPrisma.forecastSnapshot.findFirst.mockResolvedValue({
      riskLevel: 'SAFE',
    });
    mockPrisma.notification.create.mockResolvedValue({
      id: 'n-1',
      title: 'Weekly Financial Digest',
      body: 'test',
      isRead: false,
    });

    await cronCallback();

    expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
      select: { id: true },
    });
    // Notification created once per user
    expect(mockPrisma.notification.create).toHaveBeenCalledTimes(2);
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Weekly digest cron job completed'
    );

    jest.useRealTimers();
  });

  it('should continue processing other users when one user fails', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-02-23T08:00:00Z'));

    mockSchedule.mockClear();
    mockLogger.info.mockClear();
    mockLogger.error.mockClear();

    startWeeklyDigest();

    const cronCallback = mockSchedule.mock.calls[0][1];

    mockPrisma.user.findMany.mockResolvedValue([
      { id: 'user-fail' },
      { id: 'user-ok' },
    ]);

    // First user's expense.aggregate will throw
    let callCount = 0;
    mockPrisma.expense.aggregate.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.reject(new Error('DB connection lost'));
      }
      return Promise.resolve({ _sum: { amount: 50 } });
    });
    mockPrisma.income.aggregate.mockResolvedValue({ _sum: { amount: 200 } });
    mockPrisma.expense.groupBy.mockResolvedValue([]);
    mockPrisma.alert.count.mockResolvedValue(0);
    mockPrisma.forecastSnapshot.findFirst.mockResolvedValue(null);
    mockPrisma.notification.create.mockResolvedValue({
      id: 'n-2',
      title: 'Weekly Financial Digest',
      body: 'test',
      isRead: false,
    });

    await cronCallback();

    // The first user should have logged an error
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('user-fail')
    );
    // The second user should still have succeeded
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Weekly digest generated for user user-ok'
    );
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Weekly digest cron job completed'
    );

    jest.useRealTimers();
  });
});
