import { buildQueryString, getJoinedUrl } from "../query.utils";

describe("buildQueryString", () => {
  it("should return empty string when params is undefined", () => {
    expect(buildQueryString(undefined)).toBe("");
  });

  it("should return empty string when params is an empty object", () => {
    expect(buildQueryString({})).toBe("");
  });

  it("should build a query string from a single param", () => {
    expect(buildQueryString({ name: "John" })).toBe("?name=John");
  });

  it("should build a query string from multiple params", () => {
    const result = buildQueryString({ name: "John", age: 30 });
    expect(result).toBe("?name=John&age=30");
  });

  it("should skip undefined an null values", () => {
    expect(buildQueryString({ name: "John", age: undefined, type: null })).toBe(
      "?name=John"
    );
  });

  it("should convert boolean values to strings", () => {
    expect(buildQueryString({ active: true, deleted: false })).toBe(
      "?active=true&deleted=false"
    );
  });

  it("should handle array of strings", () => {
    const result = buildQueryString({ color: ["red", "green", "blue"] });
    expect(result).toBe("?color=red&color=green&color=blue");
  });

  it("should skip null and undefined values within arrays", () => {
    const result = buildQueryString({ ids: [1, null, 3, undefined, 5] });
    expect(result).toBe("?ids=1&ids=3&ids=5");
  });

  it("should return empty string when array contains only null/undefined", () => {
    expect(buildQueryString({ ids: [null, undefined] })).toBe("");
  });

  it("should handle mixed scalar and array params", () => {
    const result = buildQueryString({
      name: "John",
      tags: ["a", "b"],
      active: true
    });
    expect(result).toBe("?name=John&tags=a&tags=b&active=true");
  });

  it("should handle zero as a valid value", () => {
    expect(buildQueryString({ offset: 0 })).toBe("?offset=0");
  });

  it("should handle empty string as a valid value", () => {
    expect(buildQueryString({ search: "" })).toBe("?search=");
  });

  it("should handle an empty array", () => {
    expect(buildQueryString({ ids: [] })).toBe("");
  });

  it("should handle an empty array alongside valid params", () => {
    expect(buildQueryString({ ids: [], name: "John" })).toBe("?name=John");
  });
});

describe("getJoinedUrl", () => {
  it("should join base url and path", () => {
    expect(getJoinedUrl("https://api.example.com", "users")).toBe(
      "https://api.example.com/users"
    );
  });

  it("should strip trailing slashes from baseUrl", () => {
    expect(getJoinedUrl("https://api.example.com/", "users")).toBe(
      "https://api.example.com/users"
    );
  });

  it("should strip multiple trailing slashes from baseUrl", () => {
    expect(getJoinedUrl("https://api.example.com///", "users")).toBe(
      "https://api.example.com/users"
    );
  });

  it("should strip leading slashes from url", () => {
    expect(getJoinedUrl("https://api.example.com", "/users")).toBe(
      "https://api.example.com/users"
    );
  });

  it("should strip multiple leading slashes from url", () => {
    expect(getJoinedUrl("https://api.example.com", "///users")).toBe(
      "https://api.example.com/users"
    );
  });

  it("should handle both trailing and leading slashes", () => {
    expect(getJoinedUrl("https://api.example.com/", "/users")).toBe(
      "https://api.example.com/users"
    );
  });

  it("should handle multiple slashes on both sides", () => {
    expect(getJoinedUrl("https://api.example.com///", "///users")).toBe(
      "https://api.example.com/users"
    );
  });

  it("should preserve path segments in baseUrl", () => {
    expect(getJoinedUrl("https://api.example.com/v1", "users")).toBe(
      "https://api.example.com/v1/users"
    );
  });

  it("should preserve path segments in url", () => {
    expect(getJoinedUrl("https://api.example.com", "users/123")).toBe(
      "https://api.example.com/users/123"
    );
  });

  it("should handle both sides having path segments", () => {
    expect(getJoinedUrl("https://api.example.com/v1/", "/users/123")).toBe(
      "https://api.example.com/v1/users/123"
    );
  });

  it("should handle empty url path", () => {
    expect(getJoinedUrl("https://api.example.com", "")).toBe(
      "https://api.example.com/"
    );
  });

  it("should handle empty baseUrl", () => {
    expect(getJoinedUrl("", "users")).toBe("/users");
  });
});

