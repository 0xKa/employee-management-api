import { Request, Response, NextFunction } from 'express';
import * as employeeModel from '../models/employeeModel';
import AppError from '../utils/AppError';
import { CreateEmployeeInput, UpdateEmployeeInput, EmployeeQueryParams } from '../types/employee';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const createEmployee = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { full_name, email, phone, department, salary } = req.body as CreateEmployeeInput;

    if (!full_name || !email || !phone || !department || salary === undefined || salary === null) {
      throw new AppError('All fields are required: full_name, email, phone, department, salary', 400);
    }
    if (!EMAIL_REGEX.test(email)) {
      throw new AppError('Invalid email format', 400);
    }
    if (typeof salary !== 'number' || salary <= 0) {
      throw new AppError('Salary must be a positive number', 400);
    }

    const employee = await employeeModel.createEmployee({ full_name, email, phone, department, salary });
    res.status(201).json({ status: 'success', data: { employee } });
  } catch (err) {
    next(err);
  }
};

export const getAllEmployees = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const params = req.query as EmployeeQueryParams;
    const page = Math.max(1, parseInt(params.page || '1', 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(params.limit || '10', 10) || 10));

    const { rows, total } = await employeeModel.getAllEmployees(params);
    res.status(200).json({
      status: 'success',
      results: rows.length,
      total,
      page,
      limit,
      data: { employees: rows },
    });
  } catch (err) {
    next(err);
  }
};

export const getEmployeeById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id) || id <= 0) {
      throw new AppError('Invalid employee ID', 400);
    }

    const employee = await employeeModel.getEmployeeById(id);
    if (!employee) {
      throw new AppError('Employee not found', 404);
    }

    res.status(200).json({ status: 'success', data: { employee } });
  } catch (err) {
    next(err);
  }
};

export const updateEmployee = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id) || id <= 0) {
      throw new AppError('Invalid employee ID', 400);
    }

    const body = req.body as UpdateEmployeeInput;
    const allowedKeys: (keyof UpdateEmployeeInput)[] = [
      'full_name',
      'email',
      'phone',
      'department',
      'salary',
    ];

    const updateData: UpdateEmployeeInput = {};
    for (const key of allowedKeys) {
      if (body[key] !== undefined) {
        (updateData as Record<string, unknown>)[key] = body[key];
      }
    }

    if (Object.keys(updateData).length === 0) {
      throw new AppError('At least one field is required to update', 400);
    }
    if (updateData.email && !EMAIL_REGEX.test(updateData.email)) {
      throw new AppError('Invalid email format', 400);
    }
    if (
      updateData.salary !== undefined &&
      (typeof updateData.salary !== 'number' || updateData.salary <= 0)
    ) {
      throw new AppError('Salary must be a positive number', 400);
    }

    const employee = await employeeModel.updateEmployee(id, updateData);
    if (!employee) {
      throw new AppError('Employee not found', 404);
    }

    res.status(200).json({ status: 'success', data: { employee } });
  } catch (err) {
    next(err);
  }
};

export const deleteEmployee = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id) || id <= 0) {
      throw new AppError('Invalid employee ID', 400);
    }

    const deleted = await employeeModel.softDeleteEmployee(id);
    if (!deleted) {
      throw new AppError('Employee not found', 404);
    }

    res.status(200).json({ status: 'success', message: 'Employee deleted successfully' });
  } catch (err) {
    next(err);
  }
};
