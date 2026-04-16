export interface User {
  id: number;
  email: string;
  password_hash: string;
  role: 'admin' | 'employee';
  created_at: Date;
}

export interface TokenPayload {
  userId: number;
  role: 'admin' | 'employee';
}

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}
