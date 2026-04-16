import { Request, Response, NextFunction } from 'express';
import AppError from '../utils/AppError';

const authorize = (...roles: string[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      next(new AppError('You do not have permission to perform this action', 403));
      return;
    }
    next();
  };

export default authorize;
