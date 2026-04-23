import { buildQueryString, getJoinedUrl } from "./utils/query.utils";

import { FetchApiError } from "./errors";
import {
  CONTENT_TYPE,
  CONTENT_TYPE_HEADER
} from "./fetch-api-client.constants";
import {
  FetchApiClientEntityConfig,
  FetchApiClientHelperMiddlewares,
  FetchApiClientRequest,
  FetchApiClientResponse,
  IFetchApiClientEntity,
  WithParams
} from "./fetch-api-helper.types";
import { HttpStatusCode } from "./http-status-code.enum";
import { IMiddleware } from "./middleware";

export class FetchApiEntityFactory implements IFetchApiClientEntity {
  constructor(
    private baseUrl: string,
    private readonly middlewares: FetchApiClientHelperMiddlewares
  ) {}

  private readonly defaultHeaders: Record<string, string> = {
    Accept: CONTENT_TYPE,
    [CONTENT_TYPE_HEADER]: CONTENT_TYPE
  };

  protected client: typeof fetch = fetch;

  private applyRequestMiddlewares = (
    request: FetchApiClientRequest
  ): Promise<FetchApiClientRequest> => {
    const requests = this.middlewares?.request ?? [];

    return requests.reduce<Promise<FetchApiClientRequest>>(
      (configPromise, mw) =>
        configPromise.then(config =>
          mw.onFulfilled ? mw.onFulfilled(config) : config
        ),
      Promise.resolve(request)
    );
  };

  private applyResponseMiddleware = (
    res: FetchApiClientResponse<any>,
    mw: IMiddleware<FetchApiClientResponse<any>>
  ): FetchApiClientResponse<any> | Promise<FetchApiClientResponse<any>> => {
    if (
      // Range of success statuses
      res.status >= HttpStatusCode.Ok &&
      res.status < HttpStatusCode.MultipleChoices
    ) {
      return mw.onFulfilled ? mw.onFulfilled(res) : res;
    }
    return mw.onRejected ? mw.onRejected(res) : res;
  };

  private applyResponseMiddlewares = (
    response: FetchApiClientResponse<any>
  ): Promise<FetchApiClientResponse<any>> => {
    const responds = this.middlewares?.respond ?? [];
    return responds.reduce<Promise<FetchApiClientResponse<any>>>(
      (resPromise, mw) =>
        resPromise.then(res => {
          return this.applyResponseMiddleware(res, mw);
        }),
      Promise.resolve(response)
    );
  };

  private getHttpResponse = <T>(
    data: T,
    res: Response,
    req: RequestInit
  ): FetchApiClientResponse<T> => {
    return {
      data,
      status: res?.status,
      statusText: res?.statusText,
      config: this.getHttpRequest(req, res.url)
    };
  };

  private getHttpRequest = (
    req: RequestInit,
    url: string
  ): FetchApiClientRequest => {
    return { url, method: req.method, headers: req.headers };
  };

  private mapError = (
    error: Error,
    details: { status: string | number; data: any; url: string }
  ) => {
    const { status, data, url } = details;
    return new FetchApiError(status, error.message, data, url);
  };

  private safeJson = async <T>(response: Response): Promise<T | undefined> => {
    try {
      return (await response.json()) as Promise<T>;
    } catch {
      return undefined;
    }
  };

  private request = async <T>(
    _url: string,
    init: RequestInit
  ): Promise<FetchApiClientResponse<T>> => {
    try {
      const url = getJoinedUrl(this.baseUrl, _url);

      const processedRequest = await this.applyRequestMiddlewares({
        url,
        headers: { ...this.defaultHeaders, ...init.headers } as Record<
          string,
          string
        >,
        method: init.method
      });

      const processedInit: RequestInit = {
        ...init,
        headers: processedRequest.headers,
        method: processedRequest.method
      };

      const response = await this.client(processedRequest.url, processedInit);

      const data = (await this.safeJson<T>(response)) as T;
      const httpResponse = this.getHttpResponse(data, response, processedInit);

      // Always run response middlewares (onFulfilled for 2xx, onRejected for non-2xx)
      const processedResponse =
        await this.applyResponseMiddlewares(httpResponse);

      // After middlewares have run, throw for non-ok responses
      if (!response.ok) {
        throw this.mapError(
          new Error(response.statusText || "Request failed"),
          {
            status: response.status,
            data: processedResponse.data,
            url: response.url
          }
        );
      }

      return processedResponse;
    } catch (error) {
      if (error instanceof FetchApiError) throw error;
      throw this.mapError(
        error instanceof Error ? error : new Error(String(error)),
        { status: HttpStatusCode.BadGateway, data: undefined, url: _url }
      );
    }
  };

  public post = async <T>(
    url: string,
    data?: any,
    config?: FetchApiClientEntityConfig
  ) => {
    return this.request<T>(url, {
      ...config,
      body: JSON.stringify(data),
      method: "POST"
    });
  };

  public put = async <T>(
    url: string,
    data?: any,
    config?: FetchApiClientEntityConfig
  ) => {
    return this.request<T>(url, {
      ...config,
      body: JSON.stringify(data),
      method: "PUT"
    });
  };

  public patch = async <T>(
    url: string,
    data?: any,
    config?: FetchApiClientEntityConfig
  ) => {
    return this.request<T>(url, {
      ...config,
      body: JSON.stringify(data),
      method: "PATCH"
    });
  };

  public delete = async <T>(
    url: string,
    config?: FetchApiClientEntityConfig
  ) => {
    return this.request<T>(url, {
      ...config,
      method: "DELETE"
    });
  };

  public get = async <T>(
    url: string,
    config?: WithParams<FetchApiClientEntityConfig>
  ) => {
    const { params, ...restConfig } = config || {};
    return this.request<T>(`${url}${buildQueryString(params)}`, {
      ...restConfig,
      method: "GET"
    });
  };
}
