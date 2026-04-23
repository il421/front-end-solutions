export class FetchApiError<Details = unknown> extends Error {
  public httpStatusCode?: number | string;
  public detail?: Details | string;
  public url?: string;
  public traceId?: string;

  constructor(
    httpStatusCode: number | string,
    message: string,
    detail?: Details | string,
    url?: string,
    traceId?: string
  ) {
    super(message);

    this.httpStatusCode = httpStatusCode;
    this.message = message;
    this.traceId = traceId;
    this.detail = FetchApiError.getErrorDetails(detail);
    this.url = url;
  }

  static isFetchApError = (error: any): error is FetchApiError => {
    return error instanceof FetchApiError;
  };

  static getErrorDetails = <Details = unknown>(details: Details) => {
    if (!details) return undefined;

    if (typeof details === "object" && !(details instanceof Date)) {
      const messages = Object.keys(details).map(
        fieldName => (details as Record<string, any>)[fieldName]
      );
      return messages.join("/n");
    }
    return details?.toString();
  };
}
