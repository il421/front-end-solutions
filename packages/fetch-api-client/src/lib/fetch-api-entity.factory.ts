import { buildQueryString, getJoinedUrl } from "./utils/query.utils";

import { FetchApiError } from "./errors";
import {
  ACCEPT_HEADER,
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
  ) {
    this.defaultHeaders = new Headers({
      [ACCEPT_HEADER]: CONTENT_TYPE,
      [CONTENT_TYPE_HEADER]: CONTENT_TYPE
    });
  }

  private readonly defaultHeaders: Headers;

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
    res: FetchApiClientResponse<unknown>,
    mw: IMiddleware<FetchApiClientResponse<unknown>>
  ):
    | FetchApiClientResponse<unknown>
    | Promise<FetchApiClientResponse<unknown>> => {
    if (
      res.status >= HttpStatusCode.Ok &&
      res.status < HttpStatusCode.MultipleChoices
    ) {
      return mw.onFulfilled ? mw.onFulfilled(res) : res;
    }
    return mw.onRejected ? mw.onRejected(res) : res;
  };

  private applyResponseMiddlewares = <T>(
    response: FetchApiClientResponse<T>
  ): Promise<FetchApiClientResponse<T>> => {
    const responds = this.middlewares?.respond ?? [];
    return responds.reduce<Promise<FetchApiClientResponse<unknown>>>(
      (resPromise, mw) =>
        resPromise.then(res => this.applyResponseMiddleware(res, mw)),
      Promise.resolve(response)
    ) as Promise<FetchApiClientResponse<T>>;
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
    details: { status: string | number; data: unknown; url: string }
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

      const headers = new Headers(this.defaultHeaders);
      const initHeaders = new Headers(init.headers);
      initHeaders?.forEach((value: string, key: string) => {
        headers.append(key, value);
      });

      const processedRequest = await this.applyRequestMiddlewares({
        url,
        headers: headers,
        method: init.method
      });

      const processedInit: RequestInit = {
        ...init,
        headers: processedRequest.headers,
        method: processedRequest.method
      };

      const response = await this.client(processedRequest.url, processedInit);

      const data = (await this.safeJson<T>(response)) as T;
      const httpResponse = this.getHttpResponse<T>(
        data,
        response,
        processedInit
      );

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
    data?: unknown,
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
    data?: unknown,
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
    data?: unknown,
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
