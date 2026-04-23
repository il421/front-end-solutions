import { FetchApiError } from "../errors";
import { FetchApiEntityFactory } from "../fetch-api-entity.factory.js";
import {
  FetchApiClientRequest,
  FetchApiClientResponse
} from "../fetch-api-helper.types.js";
import { HttpStatusCode } from "../http-status-code.enum";
import { IMiddleware } from "../middleware";

const BASE_URL = "https://api.example.com";
const defaultHeaders = {
  Accept: "application/json",
  "Content-Type": "application/json"
};

const createMockResponse = (
  body: unknown,
  options: {
    status?: number;
    ok?: boolean;
    statusText?: string;
    url?: string;
  } = {}
) => {
  const {
    status = 200,
    ok = true,
    statusText = "OK",
    url = BASE_URL
  } = options;
  return {
    ok,
    status,
    statusText,
    url,
    json: () => Promise.resolve(body),
    headers: new Headers(),
    text: () => Promise.resolve(JSON.stringify(body))
  } as unknown as Response;
};

class TestableFetchApiClientEntityFactory extends FetchApiEntityFactory {
  public mockClient = vi.fn();

  constructor(...args: ConstructorParameters<typeof FetchApiEntityFactory>) {
    super(...args);
    this.client = this.mockClient as unknown as typeof fetch;
  }
}

describe("Fetch Api Entity Factory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createFactory = (
    middlewares: ConstructorParameters<typeof FetchApiEntityFactory>[1] = {}
  ) => {
    return new TestableFetchApiClientEntityFactory(BASE_URL, middlewares);
  };

  describe("GET", () => {
    test("should make a GET request with default headers", async () => {
      const factory = createFactory();
      const data = { id: 1, name: "test" };
      factory.mockClient.mockResolvedValue(createMockResponse(data));

      const result = await factory.get<typeof data>("/users");

      expect(factory.mockClient).toHaveBeenCalledWith(
        `${BASE_URL}/users`,
        expect.objectContaining({
          method: "GET",
          headers: defaultHeaders
        })
      );
      expect(result.data).toEqual(data);
    });

    test("should merge custom config with defaults", async () => {
      const factory = createFactory();
      factory.mockClient.mockResolvedValue(createMockResponse({ ok: true }));

      await factory.get("/users", {
        signal: AbortSignal.timeout(5000)
      });

      expect(factory.mockClient).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: "GET",
          signal: expect.any(AbortSignal)
        })
      );
    });

    test("should append params as query string", async () => {
      const factory = createFactory();
      factory.mockClient.mockResolvedValue(createMockResponse({}));

      await factory.get("/users", { params: { page: 1, limit: 10 } });

      expect(factory.mockClient).toHaveBeenCalledWith(
        `${BASE_URL}/users?page=1&limit=10`,
        expect.objectContaining({ method: "GET" })
      );
    });

    test("should filter out undefined and null params", async () => {
      const factory = createFactory();
      factory.mockClient.mockResolvedValue(createMockResponse({}));

      await factory.get("/users", {
        params: { page: 1, filter: undefined, sort: null }
      });

      expect(factory.mockClient).toHaveBeenCalledWith(
        `${BASE_URL}/users?page=1`,
        expect.objectContaining({ method: "GET" })
      );
    });

    test("should not append query string when params is undefined", async () => {
      const factory = createFactory();
      factory.mockClient.mockResolvedValue(createMockResponse({}));

      await factory.get("/users");

      expect(factory.mockClient).toHaveBeenCalledWith(
        `${BASE_URL}/users`,
        expect.objectContaining({ method: "GET" })
      );
    });

    test("should handle array params as repeated keys", async () => {
      const factory = createFactory();
      factory.mockClient.mockResolvedValue(createMockResponse({}));

      await factory.get("/users", { params: { page: [1, 2, 3] } });

      expect(factory.mockClient).toHaveBeenCalledWith(
        `${BASE_URL}/users?page=1&page=2&page=3`,
        expect.objectContaining({ method: "GET" })
      );
    });

    test("should handle mixed scalar and array params", async () => {
      const factory = createFactory();
      factory.mockClient.mockResolvedValue(createMockResponse({}));

      await factory.get("/users", {
        params: { status: "active", ids: [10, 20, 30] }
      });

      expect(factory.mockClient).toHaveBeenCalledWith(
        `${BASE_URL}/users?status=active&ids=10&ids=20&ids=30`,
        expect.objectContaining({ method: "GET" })
      );
    });

    test("should filter out null and undefined values inside array params", async () => {
      const factory = createFactory();
      factory.mockClient.mockResolvedValue(createMockResponse({}));

      await factory.get("/users", {
        params: { page: [1, null, undefined, 3] }
      });

      expect(factory.mockClient).toHaveBeenCalledWith(
        `${BASE_URL}/users?page=1&page=3`,
        expect.objectContaining({ method: "GET" })
      );
    });
  });

  describe("POST", () => {
    test("should make a POST request with JSON stringified body", async () => {
      const factory = createFactory();
      const requestData = { name: "new user" };
      const responseData = { id: 1, name: "new user" };
      factory.mockClient.mockResolvedValue(createMockResponse(responseData));

      const result = await factory.post<typeof responseData>(
        "/users",
        requestData
      );

      expect(factory.mockClient).toHaveBeenCalledWith(
        `${BASE_URL}/users`,
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(requestData),
          headers: defaultHeaders
        })
      );
      expect(result.data).toEqual(responseData);
    });
  });

  describe("PUT", () => {
    test("should make a PUT request with JSON stringified body", async () => {
      const factory = createFactory();
      const requestData = { id: 1, name: "updated user" };
      factory.mockClient.mockResolvedValue(createMockResponse(requestData));

      const result = await factory.put<typeof requestData>(
        "/users/1",
        requestData
      );

      expect(factory.mockClient).toHaveBeenCalledWith(
        `${BASE_URL}/users/1`,
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify(requestData),
          headers: defaultHeaders
        })
      );
      expect(result.data).toEqual(requestData);
    });
  });

  describe("PATCH", () => {
    test("should make a PATCH request with JSON stringified body", async () => {
      const factory = createFactory();
      const requestData = { name: "patched" };
      const responseData = { id: 1, name: "patched" };
      factory.mockClient.mockResolvedValue(createMockResponse(responseData));

      const result = await factory.patch<typeof responseData>(
        "/users/1",
        requestData
      );

      expect(factory.mockClient).toHaveBeenCalledWith(
        `${BASE_URL}/users/1`,
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify(requestData),
          headers: defaultHeaders
        })
      );
      expect(result.data).toEqual(responseData);
    });
  });

  describe("DELETE", () => {
    test("should make a DELETE request", async () => {
      const factory = createFactory();
      const responseData = { success: true };
      factory.mockClient.mockResolvedValue(createMockResponse(responseData));

      const result = await factory.delete<typeof responseData>("/users/1");

      expect(factory.mockClient).toHaveBeenCalledWith(
        `${BASE_URL}/users/1`,
        expect.objectContaining({
          method: "DELETE",
          headers: defaultHeaders
        })
      );
      expect(result.data).toEqual(responseData);
    });
  });

  describe("error handling", () => {
    test("should throw FetchApiError when response is not ok", async () => {
      const factory = createFactory();
      const errorBody = { message: "Not Found" };
      factory.mockClient.mockResolvedValue(
        createMockResponse(errorBody, {
          status: 404,
          ok: false,
          statusText: "Not Found"
        })
      );

      await expect(factory.get("/users/999")).rejects.toThrow(FetchApiError);
      try {
        await factory.get("/users/999");
      } catch (error) {
        expect(error).toBeInstanceOf(FetchApiError);
        const fetchApiError = error as FetchApiError;
        expect(fetchApiError.httpStatusCode).toBe(404);
        expect(fetchApiError.message).toBe("Not Found");
      }
    });

    test("should throw FetchApiError with fallback message when statusText is empty", async () => {
      const factory = createFactory();
      factory.mockClient.mockResolvedValue(
        createMockResponse(null, {
          status: 500,
          ok: false,
          statusText: ""
        })
      );

      try {
        await factory.get("/error");
      } catch (error) {
        expect(error).toBeInstanceOf(FetchApiError);
        expect((error as FetchApiError).message).toBe("Request failed");
        expect((error as FetchApiError).httpStatusCode).toBe(500);
      }
    });

    test("should throw FetchApiError with BadGateway status on fetch failure", async () => {
      const factory = createFactory();
      factory.mockClient.mockRejectedValue(new TypeError("Failed to fetch"));

      try {
        await factory.get("/users");
      } catch (error) {
        expect(error).toBeInstanceOf(FetchApiError);
        const fetchApiError = error as FetchApiError;
        expect(fetchApiError.httpStatusCode).toBe(HttpStatusCode.BadGateway);
        expect(fetchApiError.message).toBe("Failed to fetch");
      }
    });

    test("should throw FetchApiError with stringified error for non-Error rejections", async () => {
      const factory = createFactory();
      factory.mockClient.mockRejectedValue("some string error");

      try {
        await factory.get("/users");
      } catch (error) {
        expect(error).toBeInstanceOf(FetchApiError);
        const fetchApiError = error as FetchApiError;
        expect(fetchApiError.httpStatusCode).toBe(HttpStatusCode.BadGateway);
        expect(fetchApiError.message).toBe("some string error");
      }
    });

    test("should re-throw FetchApiError as-is from catch block", async () => {
      const factory = createFactory();
      const originalError = new FetchApiError(409, "Conflict", "detail");
      factory.mockClient.mockRejectedValue(originalError);

      try {
        await factory.get("/users");
      } catch (error) {
        expect(error).toBe(originalError);
        expect((error as FetchApiError).httpStatusCode).toBe(409);
      }
    });

    test("should include error body detail when response is not ok and body is parseable", async () => {
      const factory = createFactory();
      const errorDetail = { field: "email", error: "is required" };
      factory.mockClient.mockResolvedValue(
        createMockResponse(errorDetail, {
          status: 400,
          ok: false,
          statusText: "Bad Request"
        })
      );

      try {
        await factory.get("/users");
      } catch (error) {
        expect(error).toBeInstanceOf(FetchApiError);
        expect((error as FetchApiError).detail).toBeDefined();
      }
    });

    test("should handle non-JSON error response body gracefully", async () => {
      const factory = createFactory();
      factory.mockClient.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        url: BASE_URL,
        json: () => Promise.reject(new SyntaxError("Unexpected token")),
        headers: new Headers()
      } as unknown as Response);

      try {
        await factory.get("/users");
      } catch (error) {
        expect(error).toBeInstanceOf(FetchApiError);
        expect((error as FetchApiError).httpStatusCode).toBe(500);
      }
    });
  });

  describe("safeJson", () => {
    test("should return undefined when response body is not valid JSON", async () => {
      const factory = createFactory();
      factory.mockClient.mockResolvedValue({
        ok: true,
        status: 204,
        statusText: "No Content",
        url: BASE_URL,
        json: () => Promise.reject(new SyntaxError("Unexpected end of input")),
        headers: new Headers()
      } as unknown as Response);

      const result = await factory.get("/empty");
      expect(result.data).toBeUndefined();
    });
  });

  describe("request middlewares", () => {
    test("should apply a single request middleware", async () => {
      const requestMiddleware: IMiddleware<FetchApiClientRequest> = {
        onFulfilled: config => ({
          ...config,
          headers: {
            ...(config.headers as Record<string, string>),
            "X-Custom": "value"
          }
        })
      };

      const factory = createFactory({ request: [requestMiddleware] });
      factory.mockClient.mockResolvedValue(createMockResponse({}));

      await factory.get("/users");

      expect(factory.mockClient).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({ "X-Custom": "value" })
        })
      );
    });

    test("should chain multiple request middlewares in order", async () => {
      const firstMiddleware: IMiddleware<FetchApiClientRequest> = {
        onFulfilled: config => ({
          ...config,
          headers: {
            ...(config.headers as Record<string, string>),
            "X-First": "1"
          }
        })
      };

      const secondMiddleware: IMiddleware<FetchApiClientRequest> = {
        onFulfilled: config => ({
          ...config,
          headers: {
            ...(config.headers as Record<string, string>),
            "X-Second": "2"
          }
        })
      };

      const factory = createFactory({
        request: [firstMiddleware, secondMiddleware]
      });
      factory.mockClient.mockResolvedValue(createMockResponse({}));

      await factory.get("/users");

      expect(factory.mockClient).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            "X-First": "1",
            "X-Second": "2"
          })
        })
      );
    });

    test("should support async request middlewares", async () => {
      const asyncMiddleware: IMiddleware<FetchApiClientRequest> = {
        onFulfilled: async config => {
          const token = await Promise.resolve("async-token");
          return {
            ...config,
            headers: {
              ...(config.headers as Record<string, string>),
              Authorization: `Bearer ${token}`
            }
          };
        }
      };

      const factory = createFactory({ request: [asyncMiddleware] });
      factory.mockClient.mockResolvedValue(createMockResponse({}));

      await factory.get("/users");

      expect(factory.mockClient).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer async-token"
          })
        })
      );
    });

    test("should skip middleware without onFulfilled", async () => {
      const noOpMiddleware: IMiddleware<FetchApiClientRequest> = {};

      const factory = createFactory({ request: [noOpMiddleware] });
      factory.mockClient.mockResolvedValue(createMockResponse({}));

      await factory.get("/users");

      expect(factory.mockClient).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: defaultHeaders
        })
      );
    });
  });

  describe("response middlewares", () => {
    test("should apply onFulfilled for successful responses", async () => {
      const responseMiddleware: IMiddleware<FetchApiClientResponse<any>> = {
        onFulfilled: vi.fn(res => res)
      };

      const factory = createFactory({ respond: [responseMiddleware] });
      factory.mockClient.mockResolvedValue(
        createMockResponse({ data: "test" })
      );

      await factory.get("/users");

      expect(responseMiddleware.onFulfilled).toHaveBeenCalled();
    });

    test("should not call onRejected for successful responses", async () => {
      const responseMiddleware: IMiddleware<FetchApiClientResponse<any>> = {
        onFulfilled: vi.fn(res => res),
        onRejected: vi.fn(res => res)
      };

      const factory = createFactory({ respond: [responseMiddleware] });
      factory.mockClient.mockResolvedValue(createMockResponse({ ok: true }));

      await factory.get("/users");

      expect(responseMiddleware.onFulfilled).toHaveBeenCalled();
      expect(responseMiddleware.onRejected).not.toHaveBeenCalled();
    });

    test("should not call any response middleware handlers when response is not ok", async () => {
      const responseMiddleware: IMiddleware<FetchApiClientResponse<any>> = {
        onFulfilled: vi.fn(res => res),
        onRejected: vi.fn(res => res)
      };

      const factory = createFactory({ respond: [responseMiddleware] });
      factory.mockClient.mockResolvedValue(
        createMockResponse(null, {
          status: 500,
          ok: false,
          statusText: "Server Error"
        })
      );

      try {
        await factory.get("/users");
      } catch {
        // expected — FetchApiError is thrown before response middlewares run
      }

      expect(responseMiddleware.onFulfilled).not.toHaveBeenCalled();
      expect(responseMiddleware.onRejected).toHaveBeenCalled();
    });

    test("should chain multiple response middlewares", async () => {
      const callOrder: string[] = [];

      const first: IMiddleware<FetchApiClientResponse<any>> = {
        onFulfilled: res => {
          callOrder.push("first");
          return res;
        }
      };

      const second: IMiddleware<FetchApiClientResponse<any>> = {
        onFulfilled: res => {
          callOrder.push("second");
          return res;
        }
      };

      const factory = createFactory({ respond: [first, second] });
      factory.mockClient.mockResolvedValue(createMockResponse({}));

      await factory.get("/users");

      expect(callOrder).toEqual(["first", "second"]);
    });

    test("should skip response middleware without handlers", async () => {
      const noOpMiddleware: IMiddleware<FetchApiClientResponse<any>> = {};

      const factory = createFactory({ respond: [noOpMiddleware] });
      factory.mockClient.mockResolvedValue(createMockResponse({ data: "ok" }));

      const result = await factory.get<{ data: string }>("/users");
      expect(result.data).toEqual({ data: "ok" });
    });
  });

  describe("request + response middlewares together", () => {
    test("should apply both request and response middleware pipelines", async () => {
      const requestMiddleware: IMiddleware<FetchApiClientRequest> = {
        onFulfilled: config => ({
          ...config,
          headers: {
            ...(config.headers as Record<string, string>),
            Authorization: "Bearer test-token"
          }
        })
      };

      const responseFulfilledSpy = vi.fn(
        (res: FetchApiClientResponse<any>) => res
      );
      const responseMiddleware: IMiddleware<FetchApiClientResponse<any>> = {
        onFulfilled: responseFulfilledSpy
      };

      const factory = createFactory({
        request: [requestMiddleware],
        respond: [responseMiddleware]
      });

      factory.mockClient.mockResolvedValue(createMockResponse({ ok: true }));

      await factory.get("/users");

      expect(factory.mockClient).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer test-token"
          })
        })
      );
      expect(responseFulfilledSpy).toHaveBeenCalled();
    });
  });
});
