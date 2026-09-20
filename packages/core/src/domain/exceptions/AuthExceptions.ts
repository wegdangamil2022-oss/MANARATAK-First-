export class AuthenticationException extends Error {
  constructor(message: string = 'Authentication failed') {
    super(message);
    this.name = 'AuthenticationException';
  }
}

export class UnauthorizedException extends AuthenticationException {
  constructor(message: string = 'Unauthorized access') {
    super(message);
    this.name = 'UnauthorizedException';
  }
}

export class InvalidTokenException extends AuthenticationException {
  constructor(message: string = 'Invalid token') {
    super(message);
    this.name = 'InvalidTokenException';
  }
}
