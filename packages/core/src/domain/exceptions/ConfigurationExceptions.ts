export class ConfigurationException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationException';
  }
}

export class MissingConfigurationException extends ConfigurationException {
  constructor(key: string) {
    super(`Missing required configuration: ${key}`);
    this.name = 'MissingConfigurationException';
  }
}

export class InvalidConfigurationException extends ConfigurationException {
  constructor(key: string, reason: string) {
    super(`Invalid configuration for ${key}: ${reason}`);
    this.name = 'InvalidConfigurationException';
  }
}
