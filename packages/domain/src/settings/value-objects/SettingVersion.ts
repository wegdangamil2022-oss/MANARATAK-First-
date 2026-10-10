import { SettingValueData } from './SettingValueData';

export class SettingVersion {
  constructor(
    public readonly id: string,
    public readonly value: SettingValueData,
    public readonly createdAt: Date = new Date(),
    public readonly authorId?: string,
    public readonly rollbackOfVersionId?: string,
    public readonly operation: 'SET' | 'CLEAR_OVERRIDE' = 'SET',
    public readonly changeReason?: string,
  ) {
    if (!id || id.trim() === '') {
      throw new Error('SettingVersion id is required.');
    }
    if (!['SET', 'CLEAR_OVERRIDE'].includes(operation)) throw new Error('SETTINGS_VERSION_OPERATION_INVALID');
    if (operation === 'CLEAR_OVERRIDE' && (!changeReason?.trim() || changeReason.trim().length < 3)) throw new Error('SETTINGS_CHANGE_REASON_REQUIRED');
    if (changeReason && (changeReason.length > 1000 || /[\u0000-\u001f\u007f]/.test(changeReason))) throw new Error('SETTINGS_CHANGE_REASON_INVALID');
    if (!value) {
      throw new Error('SettingVersion value is required.');
    }
    if (rollbackOfVersionId && rollbackOfVersionId === id) {
      throw new Error('A setting version cannot rollback to itself.');
    }
  }
}
