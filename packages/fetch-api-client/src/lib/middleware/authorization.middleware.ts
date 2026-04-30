import {
  FetchApiClientHelperOptions,
  FetchApiClientRequest
} from "../fetch-api-helper.types";
import { IMiddleware } from "./middleware.inteface";
import {
  AUTH_HEADER,
  DEFAULT_TOKEN_SCHEMA
} from "../fetch-api-client.constants";

export class AuthorizationMiddleware implements IMiddleware<FetchApiClientRequest> {
  constructor(private options?: FetchApiClientHelperOptions) {
    this.options?.logger?.info("AuthorizationMiddleware initialized.");
  }

  onFulfilled = async (
    config: FetchApiClientRequest
  ): Promise<FetchApiClientRequest> => {
    const {
      getAccessToken,
      noAuthHeader,
      authHeader = AUTH_HEADER,
      tokenSchema = DEFAULT_TOKEN_SCHEMA
    } = this.options ?? {};

    const headers = new Headers(config.headers);
    if (noAuthHeader && headers.has(noAuthHeader)) {
      headers.delete(noAuthHeader);
      return { ...config, headers };
    }

    const token = await getAccessToken?.();
    if (token) {
      headers?.append(authHeader, `${tokenSchema} ${token}`);
      return {
        ...config,
        headers
      };
    }

    return config;
  };
}
