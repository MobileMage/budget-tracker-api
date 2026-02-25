const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const { setupSwagger } = require('./config/swagger');
const { defaultLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');

// Import route modules
const authRoutes = require('./modules/auth/auth.routes');
const usersRoutes = require('./modules/users/users.routes');
const incomeRoutes = require('./modules/income/income.routes');
const expensesRoutes = require('./modules/expenses/expenses.routes');
const budgetsRoutes = require('./modules/budgets/budgets.routes');
const analyticsRoutes = require('./modules/analytics/analytics.routes');
const alertsRoutes = require('./modules/alerts/alerts.routes');
const recommendationsRoutes = require('./modules/recommendations/recommendations.routes');
const forecastRoutes = require('./modules/forecast/forecast.routes');
const reportsRoutes = require('./modules/reports/reports.routes');
const notificationsRoutes = require('./modules/notifications/notifications.routes');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());

// Request parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// HTTP request logging
const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(
  morgan(morganFormat, {
    stream: { write: (message) => logger.http(message.trim()) },
  }),
);

// Rate limiting
app.use('/api/', defaultLimiter);

// Swagger docs
setupSwagger(app);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Student Budget Tracker API is running',
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/income', incomeRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/budgets', budgetsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/recommendations', recommendationsRoutes);
app.use('/api/forecast', forecastRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/notifications', notificationsRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Global error handler
app.use(errorHandler);

module.exports = app;
