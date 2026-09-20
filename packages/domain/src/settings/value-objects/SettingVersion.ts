import { SettingValueData } from './SettingValueData';

export class SettingVersion {
  constructor(
    public readonly id: string,
    public readonly value: SettingValueData,
    public readonly createdAt: Date = new Date(),
    public readonly authorId?: string,
    public readonly rollbackOfVersionId?: string,
  ) {
    if (!id || id.trim() === '') {
      throw new Error('SettingVersion id is required.');
    }
    if (!value) {
      throw new Error('SettingVersion value is required.');
    }
    if (rollbackOfVersionId && rollbackOfVersionId === id) {
      throw new Error('A setting version cannot rollback to itself.');
    }
  }
}
