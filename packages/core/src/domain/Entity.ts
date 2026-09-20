import { generateOpaqueIdentifier } from './IdentifierGenerator';
import { Identifier } from './Identifier';

export abstract class Entity<T> {
  protected readonly _id: Identifier<string | number>;
  public readonly props: T;

  constructor(props: T, id?: Identifier<string | number>) {
    this._id = id ? id : new Identifier<string | number>(generateOpaqueIdentifier());
    this.props = props;
  }

  get id(): Identifier<string | number> {
    return this._id;
  }

  public equals(object?: Entity<T>): boolean {
    if (object == null || object == undefined) {
      return false;
    }
    if (this === object) {
      return true;
    }
    if (!(object instanceof Entity)) {
      return false;
    }
    return this._id.equals(object._id);
  }
}
