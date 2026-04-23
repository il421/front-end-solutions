import {
  AuthorisationError,
  FetchApiError,
  NotFoundError,
  RequestError,
  ServerError
} from "../../errors";
import { FetchApiClientResponse } from "../../fetch-api-helper.types.js";
import { DefaultExceptionFilterMiddleware } from "../default-exception-filter.middleware";
import { IMiddleware } from "../middleware.inteface";

const TRACE_ID = "trace-123";
const TEST_URL = "https://api.example.com/users";

const createResponse = (
  status: number,
  statusText: string,
  data?: any,
  url: string = TEST_URL
): FetchApiClientResponse<any> => ({
  data,
  status,
  statusText,
  config: { url, method: "GET" }
});

describe("DefaultExceptionFilterMiddleware", () => {
  describe("without traceId", () => {
    const middleware = new DefaultExceptionFilterMiddleware();

    describe("Server errors (5xx)", () => {
      test("should throw ServerError for 500 status", () => {
        const res = createResponse(500, "Internal Server Error", "details");

        expect(() => middleware.onRejected(res)).toThrow(ServerError);
      });

      test("should throw ServerError for 502 status", () => {
        const res = createResponse(502, "Bad Gateway", "details");

        expect(() => middleware.onRejected(res)).toThrow(ServerError);
      });

      test("should throw ServerError for 503 status", () => {
        const res = createResponse(503, "Service Unavailable", "details");

        expect(() => middleware.onRejected(res)).toThrow(ServerError);
      });
    });

    describe("Client errors", () => {
      test("should throw NotFoundError for 404 status", () => {
        const res = createResponse(404, "Not Found", "details");

        expect(() => middleware.onRejected(res)).toThrow(NotFoundError);
      });

      test("should throw RequestError for 400 status", () => {
        const res = createResponse(400, "Bad Request", "details");

        expect(() => middleware.onRejected(res)).toThrow(RequestError);
      });

      test("should throw AuthorisationError for 401 status", () => {
        const res = createResponse(401, "Unauthorized", "details");

        expect(() => middleware.onRejected(res)).toThrow(AuthorisationError);
      });

      test("should throw AuthorisationError for 403 status", () => {
        const res = createResponse(403, "Forbidden", "details");

        expect(() => middleware.onRejected(res)).toThrow(AuthorisationError);
      });
    });

    describe("Unhandled status codes", () => {
      test("should throw FetchApiError for unhandled status codes", () => {
        const res = createResponse(409, "Conflict", "details");

        expect(() => middleware.onRejected(res)).toThrow(FetchApiError);
        try {
          middleware.onRejected(res);
        } catch (e) {
          expect(e).toBeInstanceOf(FetchApiError);
          expect(e).not.toBeInstanceOf(ServerError);
          expect(e).not.toBeInstanceOf(NotFoundError);
          expect(e).not.toBeInstanceOf(RequestError);
          expect(e).not.toBeInstanceOf(AuthorisationError);
          expect((e as FetchApiError).httpStatusCode).toBe(409);
          expect((e as FetchApiError).message).toBe("Conflict");
        }
      });
    });
  });

  describe("with traceId", () => {
    const middleware = new DefaultExceptionFilterMiddleware(TRACE_ID);

    test("should pass traceId to ServerError", () => {
      const res = createResponse(500, "Internal Server Error", "details");

      try {
        middleware.onRejected(res);
      } catch (e) {
        expect(e).toBeInstanceOf(ServerError);
        expect((e as ServerError).traceId).toBe(TRACE_ID);
      }
    });

    test("should pass traceId to NotFoundError", () => {
      const res = createResponse(404, "Not Found", "details");

      try {
        middleware.onRejected(res);
      } catch (e) {
        expect(e).toBeInstanceOf(NotFoundError);
        expect((e as NotFoundError).traceId).toBe(TRACE_ID);
      }
    });

    test("should pass traceId to RequestError", () => {
      const res = createResponse(400, "Bad Request", "details");

      try {
        middleware.onRejected(res);
      } catch (e) {
        expect(e).toBeInstanceOf(RequestError);
        expect((e as RequestError).traceId).toBe(TRACE_ID);
      }
    });

    test("should pass traceId to AuthorisationError", () => {
      const res = createResponse(401, "Unauthorized", "details");

      try {
        middleware.onRejected(res);
      } catch (e) {
        expect(e).toBeInstanceOf(AuthorisationError);
        expect((e as AuthorisationError).traceId).toBe(TRACE_ID);
      }
    });

    test("should pass traceId to FetchApiError for unhandled status codes", () => {
      const res = createResponse(429, "Too Many Requests", "details");

      try {
        middleware.onRejected(res);
      } catch (e) {
        expect(e).toBeInstanceOf(FetchApiError);
        expect((e as FetchApiError).traceId).toBe(TRACE_ID);
      }
    });

    test("should forward url from response config", () => {
      const res = createResponse(
        500,
        "Server Error",
        "details",
        "https://api.example.com/users"
      );

      try {
        middleware.onRejected(res);
      } catch (e) {
        expect(e).toBeInstanceOf(ServerError);
        expect((e as ServerError).url).toBe("https://api.example.com/users");
        expect((e as ServerError).traceId).toBe(TRACE_ID);
      }
    });
  });

  describe("error detail forwarding", () => {
    const middleware = new DefaultExceptionFilterMiddleware();

    test("should forward data from response to ServerError", () => {
      const data = { reason: "database down" };
      const res = createResponse(500, "Internal Server Error", data);

      try {
        middleware.onRejected(res);
      } catch (e) {
        expect((e as ServerError).detail).toBeDefined();
      }
    });

    test("should forward data from response to NotFoundError", () => {
      const data = { resource: "user" };
      const res = createResponse(404, "Not Found", data);

      try {
        middleware.onRejected(res);
      } catch (e) {
        expect((e as NotFoundError).detail).toBeDefined();
      }
    });

    test("should forward data from response to RequestError", () => {
      const data = { field: "email", error: "invalid" };
      const res = createResponse(400, "Bad Request", data);

      try {
        middleware.onRejected(res);
      } catch (e) {
        expect((e as RequestError).detail).toBeDefined();
      }
    });

    test("should forward data from response to AuthorisationError", () => {
      const data = { permission: "admin" };
      const res = createResponse(403, "Forbidden", data);

      try {
        middleware.onRejected(res);
      } catch (e) {
        expect((e as AuthorisationError).detail).toBeDefined();
      }
    });
  });

  describe("implements IMiddleware", () => {
    test("should not have onFulfilled defined", () => {
      const middleware = new DefaultExceptionFilterMiddleware();
      expect(
        (middleware as IMiddleware<FetchApiClientResponse<any>>).onFulfilled
      ).toBeUndefined();
    });

    test("should have onRejected defined", () => {
      const middleware = new DefaultExceptionFilterMiddleware();
      expect(middleware.onRejected).toBeDefined();
    });
  });
});
