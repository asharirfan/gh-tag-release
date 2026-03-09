export class CommandError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CommandError";
  }
}

export class ReleaseExistsError extends CommandError {
  readonly url: string;

  constructor(url: string) {
    super(`Release already exists: ${url}`);
    this.name = "ReleaseExistsError";
    this.url = url;
  }
}
