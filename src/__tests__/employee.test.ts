jest.mock("../config/db", () => ({
  __esModule: true,
  default: { query: jest.fn() },
  connectDB: jest.fn(),
}));

jest.mock("../models/employeeModel");
jest.mock("../models/userModel");

import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../app";
import * as employeeModel from "../models/employeeModel";

const mockEmployeeModel = employeeModel as jest.Mocked<typeof employeeModel>;

const adminToken = jwt.sign(
  { userId: 1, role: "admin" },
  process.env.JWT_SECRET!,
);
const employeeToken = jwt.sign(
  { userId: 2, role: "employee" },
  process.env.JWT_SECRET!,
);

const mockEmployee = {
  id: 1,
  full_name: "Jane Doe",
  email: "jane@example.com",
  phone: "+1234567890",
  department: "Engineering",
  salary: 75000,
  created_at: new Date(),
  deleted_at: null,
};

beforeEach(() => {
  jest.clearAllMocks();
});

//  POST /api/employees

describe("POST /api/employees", () => {
  it("returns 401 with no token", async () => {
    const res = await request(app).post("/api/employees").send({});
    expect(res.status).toBe(401);
  });

  it("returns 403 for employee role", async () => {
    const res = await request(app)
      .post("/api/employees")
      .set("Authorization", `Bearer ${employeeToken}`)
      .send({});
    expect(res.status).toBe(403);
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await request(app)
      .post("/api/employees")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ full_name: "Jane" });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("required");
  });

  it("returns 400 on invalid email format", async () => {
    const res = await request(app)
      .post("/api/employees")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        full_name: "Jane",
        email: "bad-email",
        phone: "123",
        department: "Eng",
        salary: 1000,
      });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Invalid email format");
  });

  it("returns 400 when salary is not positive", async () => {
    const res = await request(app)
      .post("/api/employees")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        full_name: "Jane",
        email: "jane@example.com",
        phone: "123",
        department: "Eng",
        salary: -500,
      });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Salary must be a positive number");
  });

  it("returns 409 on duplicate email", async () => {
    mockEmployeeModel.createEmployee.mockRejectedValue({ code: "23505" });

    const res = await request(app)
      .post("/api/employees")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        full_name: "Jane",
        email: "jane@example.com",
        phone: "123",
        department: "Eng",
        salary: 1000,
      });
    expect(res.status).toBe(409);
    expect(res.body.message).toBe("Email already exists");
  });

  it("returns 201 with valid payload and admin token", async () => {
    mockEmployeeModel.createEmployee.mockResolvedValue(mockEmployee);

    const res = await request(app)
      .post("/api/employees")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        full_name: "Jane Doe",
        email: "jane@example.com",
        phone: "+1234567890",
        department: "Engineering",
        salary: 75000,
      });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe("success");
    expect(res.body.data.employee.email).toBe("jane@example.com");
  });
});

//  GET /api/employees

describe("GET /api/employees", () => {
  it("returns 401 with no token", async () => {
    const res = await request(app).get("/api/employees");
    expect(res.status).toBe(401);
  });

  it("returns 200 with paginated list for admin", async () => {
    mockEmployeeModel.getAllEmployees.mockResolvedValue({
      rows: [mockEmployee],
      total: 1,
    });

    const res = await request(app)
      .get("/api/employees?page=1&limit=10")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.total).toBe(1);
    expect(res.body.data.employees).toHaveLength(1);
  });

  it("returns 200 for employee role (read access)", async () => {
    mockEmployeeModel.getAllEmployees.mockResolvedValue({ rows: [], total: 0 });

    const res = await request(app)
      .get("/api/employees")
      .set("Authorization", `Bearer ${employeeToken}`);
    expect(res.status).toBe(200);
  });
});

// GET /api/employees/:id

describe("GET /api/employees/:id", () => {
  it("returns 400 for non-numeric id", async () => {
    const res = await request(app)
      .get("/api/employees/abc")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Invalid employee ID");
  });

  it("returns 404 when employee does not exist", async () => {
    mockEmployeeModel.getEmployeeById.mockResolvedValue(null);

    const res = await request(app)
      .get("/api/employees/999")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Employee not found");
  });

  it("returns 200 with employee data", async () => {
    mockEmployeeModel.getEmployeeById.mockResolvedValue(mockEmployee);

    const res = await request(app)
      .get("/api/employees/1")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.employee.id).toBe(1);
  });
});

//  PUT /api/employees/:id

describe("PUT /api/employees/:id", () => {
  it("returns 401 with no token", async () => {
    const res = await request(app)
      .put("/api/employees/1")
      .send({ full_name: "New Name" });
    expect(res.status).toBe(401);
  });

  it("returns 403 for employee role", async () => {
    const res = await request(app)
      .put("/api/employees/1")
      .set("Authorization", `Bearer ${employeeToken}`)
      .send({ full_name: "New Name" });
    expect(res.status).toBe(403);
  });

  it("returns 400 when body is empty", async () => {
    const res = await request(app)
      .put("/api/employees/1")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("At least one field is required to update");
  });

  it("returns 400 on invalid email format", async () => {
    const res = await request(app)
      .put("/api/employees/1")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ email: "not-valid" });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Invalid email format");
  });

  it("returns 404 when employee does not exist", async () => {
    mockEmployeeModel.updateEmployee.mockResolvedValue(null);

    const res = await request(app)
      .put("/api/employees/999")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ full_name: "New Name" });
    expect(res.status).toBe(404);
  });

  it("returns 200 with updated employee", async () => {
    const updated = { ...mockEmployee, full_name: "Updated Name" };
    mockEmployeeModel.updateEmployee.mockResolvedValue(updated);

    const res = await request(app)
      .put("/api/employees/1")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ full_name: "Updated Name" });

    expect(res.status).toBe(200);
    expect(res.body.data.employee.full_name).toBe("Updated Name");
  });
});

//  DELETE /api/employees/:id

describe("DELETE /api/employees/:id", () => {
  it("returns 401 with no token", async () => {
    const res = await request(app).delete("/api/employees/1");
    expect(res.status).toBe(401);
  });

  it("returns 403 for employee role", async () => {
    const res = await request(app)
      .delete("/api/employees/1")
      .set("Authorization", `Bearer ${employeeToken}`);
    expect(res.status).toBe(403);
  });

  it("returns 404 when employee does not exist", async () => {
    mockEmployeeModel.softDeleteEmployee.mockResolvedValue(false);

    const res = await request(app)
      .delete("/api/employees/999")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });

  it("returns 200 with success message", async () => {
    mockEmployeeModel.softDeleteEmployee.mockResolvedValue(true);

    const res = await request(app)
      .delete("/api/employees/1")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.message).toBe("Employee deleted successfully");
  });
});
