import { ILogger, Logger } from "../logger";

import { FetchApiError } from "../errors";
import { FetchApiClientResponse } from "../fetch-api-helper.types";
import { IMiddleware } from "./middleware.inteface";

export class DefaultExceptionFilterMiddleware implements IMiddleware<
  FetchApiClientResponse<any>
> {
  constructor(
    private traceId?: string,
    private readonly logger: ILogger = new Logger()
  ) {
    this.logger.info("DefaultExceptionFilterMiddleware initialized.");
  }

  public onRejected = (res: FetchApiClientResponse<any>) => {
    const status = Number(res.status);
    const message = res.statusText;
    const data = res.data;
    const url = res.config.url;

    throw new FetchApiError(status, message, data, url, this.traceId);
  };
}
