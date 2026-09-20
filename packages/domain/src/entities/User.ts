import { Entity, Identifier } from '@manaratak/core';
import { Profile } from '../value-objects/Profile';
import { ContactRegistry } from './ContactRegistry';

export interface UserProps {
  profile: Profile;
  contactRegistry: ContactRegistry;
}

export class User extends Entity<UserProps> {
  constructor(props: UserProps, id?: Identifier<string | number>) {
    super(props, id);
    this.validate();
  }

  get profile(): Profile {
    return this.props.profile;
  }

  get contactRegistry(): ContactRegistry {
    return this.props.contactRegistry;
  }

  public updateProfile(newProfile: Profile): void {
    this.props.profile = newProfile;
  }

  private validate(): void {
    if (!this.props.profile) {
      throw new Error('Profile is required for User.');
    }
    if (!this.props.contactRegistry) {
      throw new Error('Contact registry is required for User.');
    }
  }
}
