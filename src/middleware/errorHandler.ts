import { Request, Response, NextFunction } from 'express';
import AppError from "../utils/AppError";

interface PgError extends Error {
  code?: string;
}

const errorHandler = (err: PgError, req: Request, res: Response): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ status: "error", message: err.message });
    return;
  }

  // postgres unique constraint violation
  if (err.code === "23505") {
    res.status(409).json({ status: "error", message: "Email already exists" });
    return;
  }

  // postgres invalid text representation (e.g. bad UUID/int cast)
  if (err.code === "22P02") {
    res.status(400).json({ status: "error", message: "Invalid ID format" });
    return;
  }

  res.status(500).json({ status: "error", message: "Internal server error" });
};

export default errorHandler;
