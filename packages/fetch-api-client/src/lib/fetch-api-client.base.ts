import { ILogger, Logger } from "./logger";

import { FetchApiEntityFactory } from "./fetch-api-entity.factory";
import {
  FetchApiEndpointsConfig,
  FetchApiClientConfig,
  FetchApiClientHelperMiddlewares,
  FetchApiClientRequest,
  FetchApiClientResponse,
  IApi
} from "./fetch-api-helper.types";
import { IMiddleware } from "./middleware";

export class FetchApiClientBase<ApiSchema = IApi> {
  constructor(
    private readonly endpoints: FetchApiEndpointsConfig,
    private readonly middlewares?: FetchApiClientHelperMiddlewares,
    private readonly logger: ILogger = new Logger()
  ) {
    this.commonRequestMiddlewares = this.middlewares?.request ?? [];
    this.commonResponseMiddlewares = this.middlewares?.respond ?? [];
    this.logger.info("FetchApiClient initialized.");
  }

  private readonly commonRequestMiddlewares: IMiddleware<FetchApiClientRequest>[];
  private readonly commonResponseMiddlewares: IMiddleware<
    FetchApiClientResponse<any>
  >[];

  public initialize = (): ApiSchema => {
    const api: IApi = {};
    for (const key in this.endpoints) {
      api[key] = this.createInstance(key, this.endpoints[key]);
    }

    return api as unknown as ApiSchema;
  };

  public createInstance = (key: string, config: FetchApiClientConfig) => {
    const { baseURL, overrideMiddlewares } = config;

    const overrideRequestMiddlewares = overrideMiddlewares?.request ?? [];
    const overrideResponseMiddlewares = overrideMiddlewares?.respond ?? [];

    this.logger.info(`FetchApiEntityFactory initialized for ${key} API.`);

    return new FetchApiEntityFactory(baseURL, {
      request: [
        ...this.commonRequestMiddlewares,
        ...overrideRequestMiddlewares
      ],
      respond: [
        ...this.commonResponseMiddlewares,
        ...overrideResponseMiddlewares
      ]
    });
  };
}
