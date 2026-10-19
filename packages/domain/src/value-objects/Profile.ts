import { ValueObject } from '@absheer/core';

export interface ProfileProps {
  displayName: string;
  avatarUrl?: string;
  preferredLanguage?: string;
  timeZone?: string;
}

export class Profile extends ValueObject<ProfileProps> {
  constructor(props: ProfileProps) {
    super(props);
  }
}
