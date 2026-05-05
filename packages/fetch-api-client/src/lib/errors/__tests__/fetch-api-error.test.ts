import { FetchApiError } from "../FetchApiError";

describe("FetchApiError", () => {
  describe("getErrorDetails", () => {
    it("returns undefined when details is falsy", () => {
      expect(FetchApiError.getErrorDetails(undefined)).toBeUndefined();
      expect(FetchApiError.getErrorDetails(null)).toBeUndefined();
      expect(FetchApiError.getErrorDetails("")).toBeUndefined();
    });

    it("returns joined values when details is a plain object", () => {
      const input = { a: "err1", b: "err2" };
      const result = FetchApiError.getErrorDetails(input);
      expect(result).toBe("err1, err2");
    });

    it("works with non-string values inside the object", () => {
      const input = { a: 1, b: 2, c: 3 };
      const result = FetchApiError.getErrorDetails(input);
      expect(result).toBe("1, 2, 3");
    });

    it("returns stringified value when details is a Date", () => {
      const d = new Date("2020-01-01");
      expect(FetchApiError.getErrorDetails(d)).toBe(d.toString());
    });

    it("returns stringified value when details is a primitive", () => {
      expect(FetchApiError.getErrorDetails(123)).toBe("123");
      expect(FetchApiError.getErrorDetails(true)).toBe("true");
    });
  });
});
