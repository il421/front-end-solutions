import { type MockInstance } from "vitest";
import { ILogger, Logger } from "../logger";

import { FetchApiEntityFactory } from "../fetch-api-entity.factory.js";
import { FetchApiClientBase } from "../fetch-api-client.base.js";
import {
  FetchApiEndpointsConfig,
  FetchApiClientRequest,
  FetchApiClientResponse
} from "../fetch-api-helper.types.js";
import { IMiddleware } from "../middleware";

vi.mock("../fetch-api-entity.factory");

describe("Fetch Api Client Base", () => {
  let logger: ILogger;
  let infoSpy: MockInstance;

  const mockEndpoints: FetchApiEndpointsConfig = {
    user: {
      baseURL: "https://localhost:7760/user"
    },
    company: {
      baseURL: "https://localhost:7760/company"
    }
  };

  beforeEach(() => {
    logger = new Logger();
    infoSpy = vi.spyOn(logger, "info");
    vi.clearAllMocks();
  });

  describe("initialization", () => {
    test("should log initialization message", () => {
      new FetchApiClientBase(mockEndpoints, undefined, logger);
      expect(infoSpy).toHaveBeenCalledWith("FetchApiClient initialized.");
    });

    test("should initialize with default logger when none provided", () => {
      expect(() => new FetchApiClientBase(mockEndpoints)).not.toThrow();
    });
  });

  describe("initialize", () => {
    test("should create an API instance for each endpoint", () => {
      const helper = new FetchApiClientBase(mockEndpoints, undefined);

      const api = helper.initialize();

      expect(api.user).toBeDefined();
      expect(api.company).toBeDefined();
    });

    test("should create FetchApiClientEntityFactory for each endpoint with correct baseURL", () => {
      const helper = new FetchApiClientBase(mockEndpoints, undefined);

      helper.initialize();

      expect(FetchApiEntityFactory).toHaveBeenCalledTimes(2);
      expect(FetchApiEntityFactory).toHaveBeenCalledWith(
        "https://localhost:7760/user",
        expect.objectContaining({
          request: [],
          respond: []
        })
      );
      expect(FetchApiEntityFactory).toHaveBeenCalledWith(
        "https://localhost:7760/company",
        expect.objectContaining({
          request: [],
          respond: []
        })
      );
    });
  });

  describe("middlewares", () => {
    test("should pass common request middlewares to each endpoint instance", () => {
      const requestMiddleware: IMiddleware<FetchApiClientRequest> = {
        onFulfilled: config => config
      };

      const helper = new FetchApiClientBase(mockEndpoints, {
        request: [requestMiddleware]
      });

      helper.initialize();

      expect(FetchApiEntityFactory).toHaveBeenCalledWith(
        "https://localhost:7760/user",
        expect.objectContaining({
          request: [requestMiddleware],
          respond: []
        })
      );
      expect(FetchApiEntityFactory).toHaveBeenCalledWith(
        "https://localhost:7760/company",
        expect.objectContaining({
          request: [requestMiddleware],
          respond: []
        })
      );
    });

    test("should pass common response middlewares to each endpoint instance", () => {
      const responseMiddleware: IMiddleware<FetchApiClientResponse<unknown>> = {
        onRejected: error => error
      };

      const helper = new FetchApiClientBase(mockEndpoints, {
        respond: [responseMiddleware]
      });

      helper.initialize();

      expect(FetchApiEntityFactory).toHaveBeenCalledWith(
        "https://localhost:7760/user",
        expect.objectContaining({
          request: [],
          respond: [responseMiddleware]
        })
      );
      expect(FetchApiEntityFactory).toHaveBeenCalledWith(
        "https://localhost:7760/company",
        expect.objectContaining({
          request: [],
          respond: [responseMiddleware]
        })
      );
    });

    test("should merge common and override request middlewares for an endpoint", () => {
      const commonRequestMiddleware: IMiddleware<FetchApiClientRequest> = {
        onFulfilled: config => config
      };

      const overrideRequestMiddleware: IMiddleware<FetchApiClientRequest> = {
        onFulfilled: config => ({
          ...config,
          headers: {
            ...(config.headers as Record<string, string>),
            "X-Override": "true"
          }
        })
      };

      const endpointsWithOverride: FetchApiEndpointsConfig = {
        user: {
          baseURL: "https://localhost:7760/user",
          overrideMiddlewares: {
            request: [overrideRequestMiddleware]
          }
        },
        company: {
          baseURL: "https://localhost:7760/company"
        }
      };

      const helper = new FetchApiClientBase(endpointsWithOverride, {
        request: [commonRequestMiddleware]
      });

      helper.initialize();

      expect(FetchApiEntityFactory).toHaveBeenCalledWith(
        "https://localhost:7760/user",
        expect.objectContaining({
          request: [commonRequestMiddleware, overrideRequestMiddleware],
          respond: []
        })
      );
      expect(FetchApiEntityFactory).toHaveBeenCalledWith(
        "https://localhost:7760/company",
        expect.objectContaining({
          request: [commonRequestMiddleware],
          respond: []
        })
      );
    });

    test("should merge common and override response middlewares for an endpoint", () => {
      const commonResponseMiddleware: IMiddleware<
        FetchApiClientResponse<unknown>
      > = {
        onRejected: error => error
      };

      const overrideResponseMiddleware: IMiddleware<
        FetchApiClientResponse<unknown>
      > = {
        onFulfilled: res => res
      };

      const endpointsWithOverride: FetchApiEndpointsConfig = {
        user: {
          baseURL: "https://localhost:7760/user",
          overrideMiddlewares: {
            respond: [overrideResponseMiddleware]
          }
        },
        company: {
          baseURL: "https://localhost:7760/company"
        }
      };

      const helper = new FetchApiClientBase(endpointsWithOverride, {
        respond: [commonResponseMiddleware]
      });

      helper.initialize();

      expect(FetchApiEntityFactory).toHaveBeenCalledWith(
        "https://localhost:7760/user",
        expect.objectContaining({
          respond: [commonResponseMiddleware, overrideResponseMiddleware]
        })
      );
      expect(FetchApiEntityFactory).toHaveBeenCalledWith(
        "https://localhost:7760/company",
        expect.objectContaining({
          respond: [commonResponseMiddleware]
        })
      );
    });

    test("should work with no middlewares passed", () => {
      const helper = new FetchApiClientBase(mockEndpoints, undefined);

      helper.initialize();

      expect(FetchApiEntityFactory).toHaveBeenCalledWith(
        "https://localhost:7760/user",
        expect.objectContaining({
          request: [],
          respond: []
        })
      );
    });
  });

  describe("createInstance", () => {
    test("should create a single FetchApiClientEntityFactory instance", () => {
      const helper = new FetchApiClientBase(mockEndpoints, undefined);

      const instance = helper.createInstance("user", {
        baseURL: "https://localhost:7760/user"
      });

      expect(instance).toBeDefined();
      expect(FetchApiEntityFactory).toHaveBeenCalledWith(
        "https://localhost:7760/user",
        expect.objectContaining({
          request: [],
          respond: []
        })
      );
    });

    test("should merge common and override middlewares in createInstance", () => {
      const commonMiddleware: IMiddleware<FetchApiClientRequest> = {
        onFulfilled: config => config
      };

      const overrideMiddleware: IMiddleware<FetchApiClientRequest> = {
        onFulfilled: config => config
      };

      const helper = new FetchApiClientBase(mockEndpoints, {
        request: [commonMiddleware]
      });

      helper.createInstance("custom", {
        baseURL: "https://localhost:7760/custom",
        overrideMiddlewares: {
          request: [overrideMiddleware]
        }
      });

      expect(FetchApiEntityFactory).toHaveBeenCalledWith(
        "https://localhost:7760/custom",
        expect.objectContaining({
          request: [commonMiddleware, overrideMiddleware]
        })
      );
    });
  });
});
