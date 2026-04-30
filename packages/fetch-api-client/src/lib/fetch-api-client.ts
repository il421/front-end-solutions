import { FetchApiClientBase } from "./fetch-api-client.base";
import {
  FetchApiEndpointsConfig,
  FetchApiClientHelperMiddlewares,
  FetchApiClientHelperOptions,
  IApi
} from "./fetch-api-helper.types";
import {
  AuthorizationMiddleware,
  DefaultExceptionFilterMiddleware
} from "./middleware";

export class FetchApiClient<
  ApiSchema = IApi
> extends FetchApiClientBase<ApiSchema> {
  constructor(
    endpoints: FetchApiEndpointsConfig,
    middlewares?: FetchApiClientHelperMiddlewares,
    options?: FetchApiClientHelperOptions
  ) {
    const request = [
      new AuthorizationMiddleware(
        options
      ),
      ...(middlewares?.request ?? [])
    ];

    const respond = [
      new DefaultExceptionFilterMiddleware(options?.traceId),
      ...(middlewares?.respond ?? [])
    ];
    super(endpoints, { respond, request }, options?.logger);
  }
}
