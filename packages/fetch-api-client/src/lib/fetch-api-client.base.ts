import { ILogger } from "./logger";
import { FetchApiEntityFactory } from "./fetch-api-entity.factory";
import {
  FetchApiEndpointsConfig,
  FetchApiClientConfig,
  FetchApiClientHelperMiddlewares,
  FetchApiClientRequest,
  FetchApiClientResponse,
  IFetchApiClientBase,
  IFetchApiClientEntity
} from "./fetch-api-helper.types";
import { IMiddleware } from "./middleware";

export class FetchApiClientBase<
  Keys extends string = string
> implements IFetchApiClientBase<Record<Keys, IFetchApiClientEntity>> {
  constructor(
    private readonly endpoints: FetchApiEndpointsConfig<Keys>,
    private readonly middlewares?: FetchApiClientHelperMiddlewares,
    private readonly logger?: ILogger
  ) {
    this.commonRequestMiddlewares = this.middlewares?.request ?? [];
    this.commonResponseMiddlewares = this.middlewares?.respond ?? [];
    this.logger?.info("FetchApiClient initialized.");
  }

  private readonly commonRequestMiddlewares: IMiddleware<FetchApiClientRequest>[];
  private readonly commonResponseMiddlewares: IMiddleware<
    FetchApiClientResponse<unknown>
  >[];

  public initialize = () => {
    const api: Record<keyof FetchApiEndpointsConfig, FetchApiEntityFactory> =
      {};
    for (const key in this.endpoints) {
      api[key as keyof FetchApiEndpointsConfig] = this.createInstance(
        key,
        this.endpoints[key]
      );
    }

    return api as unknown as Record<Keys, IFetchApiClientEntity>;
  };

  public createInstance = (
    key: keyof FetchApiEndpointsConfig,
    config: FetchApiClientConfig
  ) => {
    const { baseURL, overrideMiddlewares } = config;

    const overrideRequestMiddlewares = overrideMiddlewares?.request ?? [];
    const overrideResponseMiddlewares = overrideMiddlewares?.respond ?? [];

    this.logger?.info(`FetchApiEntityFactory initialized for ${key} API.`);

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
