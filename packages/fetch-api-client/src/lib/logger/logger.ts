import { ILogger } from "./logger.interface";

export class Logger implements ILogger {
  constructor(private readonly serviceKey?: string) {}

  private get serviceName(): string {
    return this.serviceKey ? `[${this.serviceKey}]` : "";
  }
  public info = (message: string, ...args: unknown[]): void => {
    console.info(this.serviceName, message, ...args);
  };

  public warn = (message: string, ...args: unknown[]): void => {
    console.warn(this.serviceName, message, ...args);
  };

  public debug = (message: string, ...args: unknown[]): void => {
    console.debug(this.serviceName, message, ...args);
  };

  public error = <E = Error>(
    message: string,
    error: E,
    ...args: unknown[]
  ): void => {
    console.error(this.serviceName, message, error, ...args);
  };
}
