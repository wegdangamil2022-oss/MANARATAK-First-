export class AuthorizationException extends Error {
  constructor(message: string = 'Authorization failed') {
    super(message);
    this.name = 'AuthorizationException';
  }
}

export class ForbiddenException extends AuthorizationException {
  constructor(message: string = 'Forbidden access') {
    super(message);
    this.name = 'ForbiddenException';
  }
}
