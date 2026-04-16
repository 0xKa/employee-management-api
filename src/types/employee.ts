export interface Employee {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  department: string;
  salary: number;
  created_at: Date;
  deleted_at: Date | null;
}

export interface CreateEmployeeInput {
  full_name: string;
  email: string;
  phone: string;
  department: string;
  salary: number;
}

export interface UpdateEmployeeInput {
  full_name?: string;
  email?: string;
  phone?: string;
  department?: string;
  salary?: number;
}

export interface EmployeeQueryParams {
  page?: string;
  limit?: string;
  search?: string;
}
