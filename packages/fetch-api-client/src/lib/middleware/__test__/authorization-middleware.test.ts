import { FetchApiClientRequest } from "../../fetch-api-helper.types.js";
import { AuthorizationMiddleware } from "../authorization.middleware";
import { AUTH_HEADER } from "../../fetch-api-client.constants";

const NO_AUTH_HEADER = "X-Test";
const TOKEN = "123";
const TEST_URL = "https://api.example.com/users";

const getAccessToken = () => Promise.resolve(TOKEN);

describe("AuthorizationMiddleware", () => {
  test("should remove noAuthHeader from headers", async () => {
    const authMiddleware = new AuthorizationMiddleware({ getAccessToken, noAuthHeader: NO_AUTH_HEADER });

    const result = await authMiddleware.onFulfilled?.({
      url: TEST_URL,
      headers: { [NO_AUTH_HEADER]: "some-value" }
    });

    const headers = new Headers(result.headers);
    expect(headers.has(NO_AUTH_HEADER)).toBeFalsy();
  });

  test("should add Authorization header with bearer token", async () => {
    const authMiddleware = new AuthorizationMiddleware({ getAccessToken });

    const result = await authMiddleware.onFulfilled?.({
      url: TEST_URL,
      headers: {}
    });

    const headers = new Headers(result.headers);
    expect(headers.get(AUTH_HEADER)).toBe(`Bearer ${TOKEN}`);
  });

  test("should preserve existing headers when adding Authorization", async () => {
    const authMiddleware = new AuthorizationMiddleware({ getAccessToken });

    const result = await authMiddleware.onFulfilled?.({
      url: TEST_URL,
      headers: { "X-Custom": "value" }
    });

    const headers = new Headers(result.headers);
    expect(headers.get(AUTH_HEADER)).toBe(`Bearer ${TOKEN}`);
    expect(headers.get("X-Custom")).toBe("value");
  });

  test("should return config unchanged when no token is available", async () => {
    const authMiddleware = new AuthorizationMiddleware({
      getAccessToken: () => Promise.resolve(undefined)
    });

    const input: FetchApiClientRequest = {
      url: TEST_URL,
      headers: { "X-Custom": "value" }
    };

    const result = await authMiddleware.onFulfilled?.(input);

    expect(result).toBe(input);
  });

  test("should return config unchanged when getAccessToken is not provided", async () => {
    const authMiddleware = new AuthorizationMiddleware();

    const input: FetchApiClientRequest = { url: TEST_URL, headers: {} };
    const result = await authMiddleware.onFulfilled?.(input);

    expect(result).toBe(input);
  });

  test("should preserve non-header config properties", async () => {
    const authMiddleware = new AuthorizationMiddleware({ getAccessToken });

    const result = await authMiddleware.onFulfilled?.({
      url: TEST_URL,
      headers: {},
      method: "POST"
    });

    expect(result.method).toBe("POST");
    expect(result.url).toBe(TEST_URL);
    const headers = new Headers(result.headers);
    expect(headers.get(AUTH_HEADER)).toBe(`Bearer ${TOKEN}`);
  });
});
