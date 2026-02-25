const { PrismaClient } = require('@prisma/client');
const env = require('./env');

/**
 * Singleton PrismaClient instance.
 *
 * In development mode, query and error logs are enabled.
 * In production, only error logs are emitted.
 *
 * The singleton is cached on `globalThis` during development to survive
 * hot-reloads without creating multiple database connections.
 *
 * @type {PrismaClient}
 */
const prisma =
  globalThis.__prisma ||
  new PrismaClient({
    log:
      env.NODE_ENV === 'development'
        ? [
            { emit: 'stdout', level: 'query' },
            { emit: 'stdout', level: 'info' },
            { emit: 'stdout', level: 'warn' },
            { emit: 'stdout', level: 'error' },
          ]
        : [{ emit: 'stdout', level: 'error' }],
  });

if (env.NODE_ENV === 'development') {
  globalThis.__prisma = prisma;
}

module.exports = prisma;
