import { FetchApiClientRequest } from "../../fetch-api-helper.types.js";
import { AuthorizationMiddleware } from "../authorization.middleware";

const NO_AUTH_HEADER = "X-Test";
const TOKEN = "123";
const TEST_URL = "https://api.example.com/users";

const getAccessToken = () => Promise.resolve(TOKEN);

describe("AuthorizationMiddleware", () => {
  test("should remove noAuthHeader from headers", async () => {
    const authMiddleware = new AuthorizationMiddleware(
      getAccessToken,
      NO_AUTH_HEADER
    );

    const result = await authMiddleware.onFulfilled!({
      url: TEST_URL,
      headers: { [NO_AUTH_HEADER]: "some-value" }
    });

    expect(result.headers).toEqual({});
  });

  test("should add Authorization header with bearer token", async () => {
    const authMiddleware = new AuthorizationMiddleware(getAccessToken);

    const result = await authMiddleware.onFulfilled!({
      url: TEST_URL,
      headers: {}
    });

    expect(result.headers).toEqual({ Authorization: `Bearer ${TOKEN}` });
  });

  test("should preserve existing headers when adding Authorization", async () => {
    const authMiddleware = new AuthorizationMiddleware(getAccessToken);

    const result = await authMiddleware.onFulfilled!({
      url: TEST_URL,
      headers: { "X-Custom": "value" }
    });

    expect(result.headers).toEqual({
      "X-Custom": "value",
      Authorization: `Bearer ${TOKEN}`
    });
  });

  test("should return config unchanged when no token is available", async () => {
    const authMiddleware = new AuthorizationMiddleware(() =>
      Promise.resolve(undefined)
    );

    const input: FetchApiClientRequest = {
      url: TEST_URL,
      headers: { "X-Custom": "value" }
    };

    const result = await authMiddleware.onFulfilled!(input);

    expect(result).toBe(input);
  });

  test("should return config unchanged when getAccessToken is not provided", async () => {
    const authMiddleware = new AuthorizationMiddleware();

    const input: FetchApiClientRequest = { url: TEST_URL, headers: {} };
    const result = await authMiddleware.onFulfilled!(input);

    expect(result).toBe(input);
  });

  test("should preserve non-header config properties", async () => {
    const authMiddleware = new AuthorizationMiddleware(getAccessToken);

    const result = await authMiddleware.onFulfilled!({
      url: TEST_URL,
      headers: {},
      method: "POST"
    });

    expect(result.method).toBe("POST");
    expect(result.url).toBe(TEST_URL);
    expect(result.headers).toEqual({ Authorization: `Bearer ${TOKEN}` });
  });
});
