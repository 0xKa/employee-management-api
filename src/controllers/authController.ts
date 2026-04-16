import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import * as userModel from '../models/userModel';
import AppError from '../utils/AppError';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const signToken = (userId: number, role: string): string => {
  const expiry = (process.env.JWT_EXPIRES_IN ?? '7d') as jwt.SignOptions['expiresIn'];
  return jwt.sign({ userId, role }, process.env.JWT_SECRET as string, { expiresIn: expiry });
};

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password, role = 'employee' } = req.body;

    if (!email || !password) {
      throw new AppError('Email and password are required', 400);
    }
    if (!EMAIL_REGEX.test(email)) {
      throw new AppError('Invalid email format', 400);
    }
    if (typeof password !== 'string' || password.length < 6) {
      throw new AppError('Password must be at least 6 characters', 400);
    }
    if (!['admin', 'employee'].includes(role)) {
      throw new AppError('Role must be admin or employee', 400);
    }

    const existing = await userModel.getUserByEmail(email);
    if (existing) {
      throw new AppError('Email already registered', 409);
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await userModel.createUser(email, passwordHash, role);
    const token = signToken(user.id, user.role);

    res.status(201).json({
      status: 'success',
      token,
      data: { user: { id: user.id, email: user.email, role: user.role } },
    });
  } catch (err) {
    next(err);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError('Email and password are required', 400);
    }

    const user = await userModel.getUserByEmail(email);
    const passwordMatch = user && (await bcrypt.compare(password, user.password_hash));
    if (!user || !passwordMatch) {
      throw new AppError('Invalid email or password', 401);
    }

    const token = signToken(user.id, user.role);

    res.status(200).json({
      status: 'success',
      token,
      data: { user: { id: user.id, email: user.email, role: user.role } },
    });
  } catch (err) {
    next(err);
  }
};
