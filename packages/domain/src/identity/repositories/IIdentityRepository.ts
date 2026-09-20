import { Identity } from '../../aggregates/Identity';
import { IdentityType } from '../../enums/IdentityType';
import { LifeStatus } from '../../enums/LifeStatus';

export interface ListIdentitiesCriteria {
  type?: IdentityType;
  status?: LifeStatus;
  limit?: number;
  offset?: number;
}

export interface IIdentityRepository {
  findById(id: string): Promise<Identity | null>;
  findByEmail(email: string): Promise<Identity | null>;
  findByPhone(phone: string): Promise<Identity | null>;
  save(identity: Identity): Promise<void>;
  update(identity: Identity): Promise<void>;
  delete(id: string): Promise<void>;
  findAll(): Promise<Identity[]>;
  isEmailUnique(email: string): Promise<boolean>;
  isPhoneUnique(phone: string): Promise<boolean>;
  findPaged(criteria: ListIdentitiesCriteria): Promise<{ items: Identity[]; total: number }>;
}
