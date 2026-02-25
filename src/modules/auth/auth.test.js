const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// ---------------------------------------------------------------------------
// Mock Prisma client
// ---------------------------------------------------------------------------
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
};
jest.mock('../../config/database', () => mockPrisma);

// Mock env config
jest.mock('../../config/env', () => ({
  JWT_SECRET: 'test-jwt-secret',
  JWT_REFRESH_SECRET: 'test-jwt-refresh-secret',
  JWT_EXPIRES_IN: '15m',
  JWT_REFRESH_EXPIRES_IN: '7d',
  NODE_ENV: 'test',
  PORT: 3000,
}));

const authService = require('./auth.service');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const TEST_USER = {
  id: 'user-uuid-1',
  name: 'Jane Doe',
  email: 'jane@example.com',
  passwordHash: '', // populated in beforeAll
  allowanceCycle: 'MONTHLY',
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

beforeAll(async () => {
  TEST_USER.passwordHash = await bcrypt.hash('securePass123', 10);
});

beforeEach(() => {
  jest.clearAllMocks();
});

// ===========================================================================
// register
// ===========================================================================
describe('authService.register', () => {
  it('should register a new user and return tokens', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const createdUser = {
      id: 'user-uuid-1',
      name: 'Jane Doe',
      email: 'jane@example.com',
      allowanceCycle: 'MONTHLY',
      createdAt: new Date('2025-01-01'),
    };

    mockPrisma.user.create.mockResolvedValue(createdUser);
    mockPrisma.refreshToken.create.mockResolvedValue({ id: 'rt-1' });

    const result = await authService.register({
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'securePass123',
    });

    expect(result).toHaveProperty('user');
    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('refreshToken');
    expect(result.user.email).toBe('jane@example.com');
    expect(result.user.name).toBe('Jane Doe');

    // Verify access token is valid
    const decoded = jwt.verify(result.accessToken, 'test-jwt-secret');
    expect(decoded).toHaveProperty('id', 'user-uuid-1');
    expect(decoded).toHaveProperty('email', 'jane@example.com');

    // Verify password was hashed (not stored in plain text)
    const createCall = mockPrisma.user.create.mock.calls[0][0];
    expect(createCall.data.passwordHash).not.toBe('securePass123');
    const isHashed = await bcrypt.compare('securePass123', createCall.data.passwordHash);
    expect(isHashed).toBe(true);

    // Verify refresh token was persisted
    expect(mockPrisma.refreshToken.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.refreshToken.create.mock.calls[0][0].data).toHaveProperty(
      'userId',
      'user-uuid-1'
    );
  });

  it('should throw 409 when email is already registered', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(TEST_USER);

    await expect(
      authService.register({
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'securePass123',
      })
    ).rejects.toMatchObject({
      message: 'A user with this email already exists',
      statusCode: 409,
    });

    expect(mockPrisma.user.create).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// login
// ===========================================================================
describe('authService.login', () => {
  it('should login successfully and return tokens', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(TEST_USER);
    mockPrisma.refreshToken.create.mockResolvedValue({ id: 'rt-2' });

    const result = await authService.login({
      email: 'jane@example.com',
      password: 'securePass123',
    });

    expect(result).toHaveProperty('user');
    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('refreshToken');
    expect(result.user.email).toBe('jane@example.com');

    // passwordHash must not be exposed
    expect(result.user).not.toHaveProperty('passwordHash');

    // Tokens should be valid JWTs
    const decoded = jwt.verify(result.accessToken, 'test-jwt-secret');
    expect(decoded.id).toBe(TEST_USER.id);
  });

  it('should throw 401 for non-existent email', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await expect(
      authService.login({
        email: 'nobody@example.com',
        password: 'securePass123',
      })
    ).rejects.toMatchObject({
      message: 'Invalid email or password',
      statusCode: 401,
    });
  });

  it('should throw 401 for wrong password', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(TEST_USER);

    await expect(
      authService.login({
        email: 'jane@example.com',
        password: 'wrongPassword!',
      })
    ).rejects.toMatchObject({
      message: 'Invalid email or password',
      statusCode: 401,
    });
  });
});

// ===========================================================================
// refreshToken
// ===========================================================================
describe('authService.refreshToken', () => {
  it('should return a new access token for a valid refresh token', async () => {
    // Generate a real refresh token so jwt.verify succeeds
    const realRefreshToken = jwt.sign(
      { id: 'user-uuid-1', email: 'jane@example.com' },
      'test-jwt-refresh-secret',
      { expiresIn: '7d' }
    );

    mockPrisma.refreshToken.findUnique.mockResolvedValue({
      id: 'rt-1',
      token: realRefreshToken,
      userId: 'user-uuid-1',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    });

    const result = await authService.refreshToken(realRefreshToken);

    expect(result).toHaveProperty('accessToken');
    const decoded = jwt.verify(result.accessToken, 'test-jwt-secret');
    expect(decoded.id).toBe('user-uuid-1');
    expect(decoded.email).toBe('jane@example.com');
  });

  it('should throw 401 for an invalid refresh token', async () => {
    await expect(
      authService.refreshToken('totally-invalid-token')
    ).rejects.toMatchObject({
      message: 'Invalid or expired refresh token',
      statusCode: 401,
    });
  });

  it('should throw 401 when refresh token is not in database', async () => {
    const realRefreshToken = jwt.sign(
      { id: 'user-uuid-1', email: 'jane@example.com' },
      'test-jwt-refresh-secret',
      { expiresIn: '7d' }
    );

    mockPrisma.refreshToken.findUnique.mockResolvedValue(null);

    await expect(
      authService.refreshToken(realRefreshToken)
    ).rejects.toMatchObject({
      message: 'Refresh token not found. It may have been revoked.',
      statusCode: 401,
    });
  });

  it('should throw 401 and delete expired refresh token', async () => {
    const realRefreshToken = jwt.sign(
      { id: 'user-uuid-1', email: 'jane@example.com' },
      'test-jwt-refresh-secret',
      { expiresIn: '7d' }
    );

    mockPrisma.refreshToken.findUnique.mockResolvedValue({
      id: 'rt-expired',
      token: realRefreshToken,
      userId: 'user-uuid-1',
      expiresAt: new Date(Date.now() - 1000), // already expired
      createdAt: new Date(),
    });
    mockPrisma.refreshToken.delete.mockResolvedValue({});

    await expect(
      authService.refreshToken(realRefreshToken)
    ).rejects.toMatchObject({
      message: 'Refresh token has expired',
      statusCode: 401,
    });

    expect(mockPrisma.refreshToken.delete).toHaveBeenCalledWith({
      where: { id: 'rt-expired' },
    });
  });
});

// ===========================================================================
// logout
// ===========================================================================
describe('authService.logout', () => {
  it('should delete the refresh token from the database', async () => {
    mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

    await authService.logout('some-refresh-token');

    expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({
      where: { token: 'some-refresh-token' },
    });
  });

  it('should not throw when refresh token does not exist', async () => {
    mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 0 });

    await expect(
      authService.logout('nonexistent-token')
    ).resolves.not.toThrow();
  });
});
