jest.mock('../config/db', () => ({
  __esModule: true,
  default: { query: jest.fn() },
  connectDB: jest.fn(),
}));

jest.mock('../models/userModel');
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
  compare: jest.fn(),
}));

import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../app';
import * as userModel from '../models/userModel';

const mockUserModel = userModel as jest.Mocked<typeof userModel>;
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

const mockUser = {
  id: 1,
  email: 'admin@example.com',
  password_hash: 'hashed_password',
  role: 'admin' as const,
  created_at: new Date(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /api/auth/register', () => {
  it('returns 201 and a token on valid registration', async () => {
    mockUserModel.getUserByEmail.mockResolvedValue(null);
    mockUserModel.createUser.mockResolvedValue(mockUser);

    const res = await request(app).post('/api/auth/register').send({
      email: 'admin@example.com',
      password: 'secret123',
      role: 'admin',
    });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
    expect(res.body.token).toBeDefined();
    expect(res.body.data.user.email).toBe('admin@example.com');
    expect(res.body.data.user.role).toBe('admin');
    expect(res.body.data.user.password_hash).toBeUndefined();
  });

  it('returns 400 when email is missing', async () => {
    const res = await request(app).post('/api/auth/register').send({ password: 'secret123' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Email and password are required');
  });

  it('returns 400 when password is missing', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'a@b.com' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Email and password are required');
  });

  it('returns 400 when password is shorter than 6 characters', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'a@b.com', password: 'abc' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Password must be at least 6 characters');
  });

  it('returns 400 on invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: 'secret123' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid email format');
  });

  it('returns 400 on invalid role', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'a@b.com', password: 'secret123', role: 'superuser' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Role must be admin or employee');
  });

  it('returns 409 when email is already registered', async () => {
    mockUserModel.getUserByEmail.mockResolvedValue(mockUser);

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'admin@example.com', password: 'secret123' });
    expect(res.status).toBe(409);
    expect(res.body.message).toBe('Email already registered');
  });
});

describe('POST /api/auth/login', () => {
  it('returns 200 and a token on valid credentials', async () => {
    mockUserModel.getUserByEmail.mockResolvedValue(mockUser);
    mockBcrypt.compare.mockResolvedValue(true as never);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'secret123' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.token).toBeDefined();
    expect(res.body.data.user.email).toBe('admin@example.com');
  });

  it('returns 400 when fields are missing', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'a@b.com' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Email and password are required');
  });

  it('returns 401 when user is not found', async () => {
    mockUserModel.getUserByEmail.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'unknown@example.com', password: 'secret123' });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid email or password');
  });

  it('returns 401 on wrong password', async () => {
    mockUserModel.getUserByEmail.mockResolvedValue(mockUser);
    mockBcrypt.compare.mockResolvedValue(false as never);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'wrongpassword' });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid email or password');
  });
});
