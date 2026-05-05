import { FetchApiClientBase } from "./fetch-api-client.base";
import {
  FetchApiEndpointsConfig,
  FetchApiClientHelperMiddlewares,
  FetchApiClientHelperOptions
} from "./fetch-api-helper.types";
import {
  AuthorizationMiddleware,
  DefaultExceptionFilterMiddleware
} from "./middleware";

export class FetchApiClient<
  Keys extends string = string
> extends FetchApiClientBase<Keys> {
  constructor(
    endpoints: FetchApiEndpointsConfig<Keys>,
    middlewares?: FetchApiClientHelperMiddlewares,
    options?: FetchApiClientHelperOptions
  ) {
    const request = [
      new AuthorizationMiddleware(options),
      ...(middlewares?.request ?? [])
    ];

    const respond = [
      new DefaultExceptionFilterMiddleware(options?.traceId, options?.logger),
      ...(middlewares?.respond ?? [])
    ];
    super(
      endpoints as unknown as FetchApiEndpointsConfig<Keys>,
      { respond, request },
      options?.logger
    );
  }
}
