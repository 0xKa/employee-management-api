jest.mock("../config/db", () => ({
  __esModule: true,
  default: { query: jest.fn() },
  connectDB: jest.fn(),
}));

import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import authenticate from "../middleware/authenticate";
import authorize from "../middleware/authorize";
import errorHandler from "../middleware/errorHandler";
import notFound from "../middleware/notFound";
import AppError from "../utils/AppError";

const makeReq = (overrides: Partial<Request> = {}): Request =>
  ({ headers: {}, ...overrides }) as unknown as Request;

const makeRes = (): jest.Mocked<Response> => {
  const res = {} as jest.Mocked<Response>;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  res.headersSent = false;
  return res;
};

const makeNext = (): jest.Mock => jest.fn();

//  authenticate

describe("authenticate middleware", () => {
  it("calls next with 401 AppError when no Authorization header", () => {
    const req = makeReq();
    const next = makeNext();

    authenticate(req, makeRes(), next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    expect((next.mock.calls[0][0] as AppError).statusCode).toBe(401);
  });

  it("calls next with 401 AppError when header does not start with Bearer", () => {
    const req = makeReq({ headers: { authorization: "Token abc123" } });
    const next = makeNext();

    authenticate(req, makeRes(), next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    expect((next.mock.calls[0][0] as AppError).statusCode).toBe(401);
  });

  it("calls next with 401 AppError on invalid token", () => {
    const req = makeReq({
      headers: { authorization: "Bearer invalid.token.here" },
    });
    const next = makeNext();

    authenticate(req, makeRes(), next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    expect((next.mock.calls[0][0] as AppError).statusCode).toBe(401);
  });

  it("sets req.user and calls next with no args on valid token", () => {
    const token = jwt.sign(
      { userId: 1, role: "admin" },
      process.env.JWT_SECRET!,
    );
    const req = makeReq({
      headers: { authorization: `Bearer ${token}` },
    }) as Request & { user?: object };
    const next = makeNext();

    authenticate(req, makeRes(), next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toMatchObject({ userId: 1, role: "admin" });
  });
});

// authorize

describe("authorize middleware", () => {
  it("calls next with 403 AppError when req.user is undefined", () => {
    const req = makeReq() as Request;
    const next = makeNext();

    authorize("admin")(req, makeRes(), next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    expect((next.mock.calls[0][0] as AppError).statusCode).toBe(403);
  });

  it("calls next with 403 AppError when role is not in allowed list", () => {
    const req = makeReq() as Request;
    req.user = { userId: 2, role: "employee" };
    const next = makeNext();

    authorize("admin")(req, makeRes(), next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    expect((next.mock.calls[0][0] as AppError).statusCode).toBe(403);
  });

  it("calls next with no args when role matches", () => {
    const req = makeReq() as Request;
    req.user = { userId: 1, role: "admin" };
    const next = makeNext();

    authorize("admin", "employee")(req, makeRes(), next);

    expect(next).toHaveBeenCalledWith();
  });
});

// errorHandler

describe("errorHandler middleware", () => {
  it("responds with AppError statusCode and message", () => {
    const err = new AppError("not found", 404);
    const res = makeRes();

    errorHandler(err, makeReq(), res, makeNext());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      status: "error",
      message: "not found",
    });
  });

  it("responds 409 for postgres unique constraint error (code 23505)", () => {
    const err = Object.assign(new Error("dup"), { code: "23505" });
    const res = makeRes();

    errorHandler(err, makeReq(), res, makeNext());

    expect(res.status).toHaveBeenCalledWith(409);
  });

  it("responds 400 for postgres invalid representation error (code 22P02)", () => {
    const err = Object.assign(new Error("bad cast"), { code: "22P02" });
    const res = makeRes();

    errorHandler(err, makeReq(), res, makeNext());

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("responds 500 for generic errors", () => {
    const err = new Error("something broke");
    const res = makeRes();

    errorHandler(err, makeReq(), res, makeNext());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      status: "error",
      message: "Internal server error",
    });
  });

  it("calls next(err) when headers already sent", () => {
    const err = new AppError("too late", 500);
    const res = makeRes();
    res.headersSent = true;
    const next = makeNext();

    errorHandler(err, makeReq(), res, next);

    expect(next).toHaveBeenCalledWith(err);
    expect(res.json).not.toHaveBeenCalled();
  });
});

/// notFound

describe("notFound middleware", () => {
  it("calls next with a 404 AppError containing the route path", () => {
    const req = makeReq({ originalUrl: "/api/unknown" });
    const next = makeNext();

    notFound(req, makeRes(), next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const err = next.mock.calls[0][0] as AppError;
    expect(err.statusCode).toBe(404);
    expect(err.message).toContain("/api/unknown");
  });
});
