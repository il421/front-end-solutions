export interface IMiddleware<T> {
  onFulfilled?: (data: T) => T | Promise<T>;
  onRejected?: (data: T) => T;
}
