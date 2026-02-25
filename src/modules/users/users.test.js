const bcrypt = require('bcrypt');

// ---------------------------------------------------------------------------
// Mock Prisma client
// ---------------------------------------------------------------------------
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
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

const usersService = require('./users.service');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const USER_ID = 'user-uuid-1';
let storedHash = '';

const buildUser = (overrides = {}) => ({
  id: USER_ID,
  name: 'Jane Doe',
  email: 'jane@example.com',
  passwordHash: storedHash,
  allowanceCycle: 'MONTHLY',
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  ...overrides,
});

const buildProfileResponse = (overrides = {}) => ({
  id: USER_ID,
  name: 'Jane Doe',
  email: 'jane@example.com',
  allowanceCycle: 'MONTHLY',
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  ...overrides,
});

beforeAll(async () => {
  storedHash = await bcrypt.hash('securePass123', 10);
});

beforeEach(() => {
  jest.clearAllMocks();
});

// ===========================================================================
// getProfile
// ===========================================================================
describe('usersService.getProfile', () => {
  it('should return the user profile without passwordHash', async () => {
    const profile = buildProfileResponse();
    mockPrisma.user.findUnique.mockResolvedValue(profile);

    const result = await usersService.getProfile(USER_ID);

    expect(result).toEqual(profile);
    expect(result).not.toHaveProperty('passwordHash');
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: USER_ID },
      select: {
        id: true,
        name: true,
        email: true,
        allowanceCycle: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  });

  it('should throw 404 when user is not found', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await expect(usersService.getProfile('nonexistent-id')).rejects.toMatchObject({
      message: 'User not found',
      statusCode: 404,
    });
  });
});

// ===========================================================================
// updateProfile
// ===========================================================================
describe('usersService.updateProfile', () => {
  it('should update the user name', async () => {
    const updatedProfile = buildProfileResponse({ name: 'Jane Smith' });
    mockPrisma.user.update.mockResolvedValue(updatedProfile);

    const result = await usersService.updateProfile(USER_ID, { name: 'Jane Smith' });

    expect(result.name).toBe('Jane Smith');
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: USER_ID },
      data: { name: 'Jane Smith' },
      select: {
        id: true,
        name: true,
        email: true,
        allowanceCycle: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  });

  it('should update the allowanceCycle', async () => {
    const updatedProfile = buildProfileResponse({ allowanceCycle: 'WEEKLY' });
    mockPrisma.user.update.mockResolvedValue(updatedProfile);

    const result = await usersService.updateProfile(USER_ID, {
      allowanceCycle: 'WEEKLY',
    });

    expect(result.allowanceCycle).toBe('WEEKLY');
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: USER_ID },
      data: { allowanceCycle: 'WEEKLY' },
      select: expect.any(Object),
    });
  });

  it('should update both name and allowanceCycle together', async () => {
    const updatedProfile = buildProfileResponse({
      name: 'Updated Name',
      allowanceCycle: 'BIWEEKLY',
    });
    mockPrisma.user.update.mockResolvedValue(updatedProfile);

    const result = await usersService.updateProfile(USER_ID, {
      name: 'Updated Name',
      allowanceCycle: 'BIWEEKLY',
    });

    expect(result.name).toBe('Updated Name');
    expect(result.allowanceCycle).toBe('BIWEEKLY');
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: USER_ID },
      data: { name: 'Updated Name', allowanceCycle: 'BIWEEKLY' },
      select: expect.any(Object),
    });
  });

  it('should not include undefined fields in the update payload', async () => {
    mockPrisma.user.update.mockResolvedValue(buildProfileResponse());

    await usersService.updateProfile(USER_ID, { name: 'Only Name' });

    const updateCall = mockPrisma.user.update.mock.calls[0][0];
    expect(updateCall.data).toEqual({ name: 'Only Name' });
    expect(updateCall.data).not.toHaveProperty('allowanceCycle');
  });
});

// ===========================================================================
// changePassword
// ===========================================================================
describe('usersService.changePassword', () => {
  it('should change the password when current password is correct', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(buildUser());
    mockPrisma.user.update.mockResolvedValue({});

    await usersService.changePassword(USER_ID, 'securePass123', 'newPassword456');

    expect(mockPrisma.user.update).toHaveBeenCalledTimes(1);
    const updateCall = mockPrisma.user.update.mock.calls[0][0];
    expect(updateCall.where).toEqual({ id: USER_ID });

    // Verify the new password was hashed, not stored plain
    const newHash = updateCall.data.passwordHash;
    expect(newHash).not.toBe('newPassword456');
    const isValid = await bcrypt.compare('newPassword456', newHash);
    expect(isValid).toBe(true);
  });

  it('should throw 401 when current password is incorrect', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(buildUser());

    await expect(
      usersService.changePassword(USER_ID, 'wrongPassword', 'newPassword456')
    ).rejects.toMatchObject({
      message: 'Current password is incorrect',
      statusCode: 401,
    });

    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it('should throw 404 when user is not found', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await expect(
      usersService.changePassword('nonexistent-id', 'any', 'any')
    ).rejects.toMatchObject({
      message: 'User not found',
      statusCode: 404,
    });
  });
});

// ===========================================================================
// deleteAccount
// ===========================================================================
describe('usersService.deleteAccount', () => {
  it('should delete the user account', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(buildUser());
    mockPrisma.user.delete.mockResolvedValue({});

    await usersService.deleteAccount(USER_ID);

    expect(mockPrisma.user.delete).toHaveBeenCalledWith({
      where: { id: USER_ID },
    });
  });

  it('should throw 404 when user is not found', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await expect(usersService.deleteAccount('nonexistent-id')).rejects.toMatchObject({
      message: 'User not found',
      statusCode: 404,
    });

    expect(mockPrisma.user.delete).not.toHaveBeenCalled();
  });
});
