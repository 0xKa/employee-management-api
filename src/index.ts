import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger';
import authRoutes from './routes/authRoutes';
import employeeRoutes from './routes/employeeRoutes';
import notFound from './middleware/notFound';
import errorHandler from './middleware/errorHandler';
import { connectDB } from './config/db';

const REQUIRED_ENV = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'JWT_SECRET'];
const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);

app.use(notFound);
app.use(errorHandler);

const start = async (): Promise<void> => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Swagger docs: http://localhost:${PORT}/api/docs`);
  });
};

start();
