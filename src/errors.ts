export class WrapperConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WrapperConfigError";
  }
}

export class ProviderRequestError extends Error {
  public readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ProviderRequestError";
    this.status = status;
  }
}
