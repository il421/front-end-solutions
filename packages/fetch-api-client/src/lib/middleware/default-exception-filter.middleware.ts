import { ILogger } from "../logger";

import { FetchApiError } from "../errors";
import { FetchApiClientResponse } from "../fetch-api-helper.types";
import { IMiddleware } from "./middleware.inteface";

export class DefaultExceptionFilterMiddleware implements IMiddleware<
  FetchApiClientResponse<unknown>
> {
  constructor(
    private readonly traceId?: string,
    private readonly logger?: ILogger
  ) {
    this?.logger?.info("DefaultExceptionFilterMiddleware initialized.");
  }

  public onRejected = (res: FetchApiClientResponse<unknown>) => {
    const status = Number(res.status);
    const message = res.statusText;
    const data = res.data;
    const url = res.config.url;

    throw new FetchApiError(status, message, data, url, this.traceId);
  };
}
