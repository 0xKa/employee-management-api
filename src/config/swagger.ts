import swaggerJsdoc from 'swagger-jsdoc';
import path from 'path';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Employee Management API',
      version: '1.0.0',
      description: 'RESTful API for managing employee records',
    },
    servers: [{ url: `http://localhost:${process.env.PORT || 3000}` }],
    components: {
      schemas: {
        Employee: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            full_name: { type: 'string', example: 'Reda Hilal' },
            email: { type: 'string', format: 'email', example: 'reda@example.com' },
            phone: { type: 'string', example: '+1234567890' },
            department: { type: 'string', example: 'Engineering' },
            salary: { type: 'number', example: 75000 },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'error' },
            message: { type: 'string', example: 'Employee not found' },
          },
        },
      },
    },
  },
  // Resolves correctly whether running via ts-node (src/) or compiled (dist/)
  apis: [
    path.resolve(__dirname, '../routes/*.ts'),
    path.resolve(__dirname, '../routes/*.js'),
  ],
};

export default swaggerJsdoc(options);
