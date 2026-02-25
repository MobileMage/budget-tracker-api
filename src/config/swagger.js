const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const path = require('path');
const env = require('./env');

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Student Budget Tracker API',
    version: '1.0.0',
    description:
      'RESTful API for tracking student budgets, expenses, and income.',
    license: {
      name: 'MIT',
    },
  },
  servers: [
    {
      url: `http://localhost:${env.PORT}`,
      description: 'Development server',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT access token',
      },
    },
  },
  security: [
    {
      BearerAuth: [],
    },
  ],
};

const options = {
  swaggerDefinition,
  apis: [
    path.resolve(__dirname, '../modules/**/*.routes.js'),
  ],
};

/**
 * Generated OpenAPI 3.0.0 specification object produced by swagger-jsdoc.
 * @type {object}
 */
const swaggerSpec = swaggerJsdoc(options);

/**
 * Mounts Swagger UI on the given Express application at the specified path.
 *
 * @param {import('express').Application} app - The Express application instance.
 * @param {string} [routePath='/api-docs'] - The URL path where Swagger UI will be served.
 */
function setupSwagger(app, routePath = '/api-docs') {
  app.use(
    routePath,
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      explorer: true,
      customSiteTitle: 'Student Budget Tracker API Docs',
    })
  );
}

module.exports = { swaggerSpec, setupSwagger };
