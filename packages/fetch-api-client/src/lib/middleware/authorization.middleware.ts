import { ILogger, Logger } from "../logger";

import { FetchApiClientRequest } from "../fetch-api-helper.types";
import { IMiddleware } from "./middleware.inteface";

export class AuthorizationMiddleware implements IMiddleware<FetchApiClientRequest> {
  constructor(
    private getAccessToken?: () => Promise<string | undefined>,
    private noAuthHeader?: string,
    private readonly logger: ILogger = new Logger(),
    private readonly tokenSchema: string = "Bearer"
  ) {
    this.logger.info("AuthorizationMiddleware initialized.");
  }

  onFulfilled = async (
    config: FetchApiClientRequest
  ): Promise<FetchApiClientRequest> => {
    const headers = (config.headers ?? {}) as Record<string, string>;

    if (this.noAuthHeader && this.noAuthHeader in headers) {
      const { [this.noAuthHeader]: _, ...rest } = headers;
      return { ...config, headers: rest };
    }

    const token = await this.getAccessToken?.();
    if (token) {
      return {
        ...config,
        headers: { ...headers, Authorization: `${this.tokenSchema} ${token}` }
      };
    }

    return config;
  };
}
