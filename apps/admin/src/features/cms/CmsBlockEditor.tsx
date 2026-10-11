import { useState } from 'react';
import { AssetPicker } from '../../components/AssetPicker';
import { useTranslation } from '../../i18n/I18nProvider';
export interface CmsFieldSchema {
  type: string;
  properties?: Record<string, CmsFieldSchema>;
  required?: string[];
  items?: CmsFieldSchema;
  minItems?: number;
  maxItems?: number;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  enum?: unknown[];
  const?: unknown;
}
export interface EditableBlockSchema {
  id: string;
  status: string;
  nameAr: string;
  nameEn?: string;
  version: number;
  fieldSchema: CmsFieldSchema;
  assetFields: string[];
}
export interface EditableBlock {
  id: string;
  schemaId: string;
  name: string;
  version: number;
  payload: Record<string, unknown>;
  status: string;
}
export function emptyCmsField(schema: CmsFieldSchema): unknown {
  if (Object.hasOwn(schema, 'const')) return schema.const;
  if (schema.enum?.length) return schema.enum[0];
  if (schema.type === 'object')
    return Object.fromEntries(
      (schema.required ?? []).map((key) => [key, emptyCmsField(schema.properties![key])]),
    );
  if (schema.type === 'array')
    return Array.from({ length: Math.max(0, schema.minItems ?? 0) }, () =>
      emptyCmsField(schema.items!),
    );
  if (schema.type === 'boolean') return false;
  if (schema.type === 'integer' || schema.type === 'number') return schema.minimum ?? 0;
  if (schema.type === 'null') return null;
  return '';
}
function CmsBlockField({
  schema,
  value,
  onChange,
  assetFields,
  path = '',
  label = '',
  required = true,
}: {
  schema: CmsFieldSchema;
  value: unknown;
  onChange: (value: unknown) => void;
  assetFields: string[];
  path?: string;
  label?: string;
  required?: boolean;
}) {
  const { language } = useTranslation();
  const ar = language === 'ar';
  if (Object.hasOwn(schema, 'const'))
    return (
      <p>
        {label}: {JSON.stringify(schema.const)}
      </p>
    );
  if (schema.enum)
    return (
      <label>
        {label}
        <select
          value={JSON.stringify(value)}
          onChange={(event) => onChange(JSON.parse(event.target.value))}
        >
          {schema.enum.map((option, index) => (
            <option key={index} value={JSON.stringify(option)}>
              {JSON.stringify(option)}
            </option>
          ))}
        </select>
      </label>
    );
  if (schema.type === 'object') {
    const data =
      value && typeof value === 'object' && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : {};
    return (
      <fieldset className="space-y-3 rounded-lg border p-3">
        <legend>{label}</legend>
        {Object.entries(schema.properties ?? {}).map(([key, child]) => {
          const mandatory = schema.required?.includes(key) ?? false;
          const present = Object.hasOwn(data, key);
          return (
            <div key={key}>
              {!mandatory && (
                <label>
                  <input
                    type="checkbox"
                    checked={present}
                    onChange={(event) => {
                      const next = { ...data };
                      if (event.target.checked) next[key] = emptyCmsField(child);
                      else delete next[key];
                      onChange(next);
                    }}
                  />
                  {key} ({ar ? 'اختياري' : 'optional'})
                </label>
              )}
              {(mandatory || present) && (
                <CmsBlockField
                  schema={child}
                  value={data[key]}
                  label={key}
                  required={mandatory}
                  path={path ? `${path}.${key}` : key}
                  assetFields={assetFields}
                  onChange={(next) => onChange({ ...data, [key]: next })}
                />
              )}
            </div>
          );
        })}
      </fieldset>
    );
  }
  if (schema.type === 'array') {
    const items = Array.isArray(value) ? value : [];
    return (
      <fieldset className="space-y-2 rounded-lg border p-3">
        <legend>{label}</legend>
        {items.map((item, index) => (
          <div key={index}>
            <CmsBlockField
              schema={schema.items!}
              value={item}
              onChange={(next) => onChange(items.map((entry, i) => (i === index ? next : entry)))}
              assetFields={assetFields}
              path={path}
              label={`${label} ${index + 1}`}
            />
            <button
              type="button"
              disabled={items.length <= (schema.minItems ?? 0)}
              onClick={() => onChange(items.filter((_, i) => i !== index))}
            >
              {ar ? 'حذف العنصر' : 'Remove item'}
            </button>
          </div>
        ))}
        <button
          type="button"
          disabled={items.length >= Math.min(100, schema.maxItems ?? 100)}
          onClick={() => onChange([...items, emptyCmsField(schema.items!)])}
        >
          {ar ? 'إضافة عنصر' : 'Add item'}
        </button>
      </fieldset>
    );
  }
  if (assetFields.includes(path))
    return (
      <AssetPicker
        label={label}
        purpose="CMS_BLOCK_ASSET"
        value={typeof value === 'string' ? value : ''}
        onChange={onChange}
      />
    );
  if (schema.type === 'boolean')
    return (
      <label>
        <input
          type="checkbox"
          checked={value === true}
          onChange={(event) => onChange(event.target.checked)}
        />
        {label}
      </label>
    );
  if (schema.type === 'null') return null;
  if (schema.type === 'number' || schema.type === 'integer')
    return (
      <label>
        {label}
        <input
          type="number"
          required={required}
          min={schema.minimum}
          max={schema.maximum}
          step={schema.type === 'integer' ? 1 : 'any'}
          value={typeof value === 'number' ? value : ''}
          onChange={(event) =>
            onChange(event.target.value === '' ? undefined : Number(event.target.value))
          }
        />
      </label>
    );
  return (
    <label className="block">
      {label}
      <textarea
        className="w-full rounded border p-2"
        required={required}
        minLength={schema.minLength}
        maxLength={schema.maxLength}
        value={typeof value === 'string' ? value : ''}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
export function CmsBlockEditor({
  schemas,
  blocks,
  disabled,
  onSave,
}: {
  schemas: EditableBlockSchema[];
  blocks: EditableBlock[];
  disabled: boolean;
  onSave: (data: {
    id?: string;
    expectedVersion?: number;
    schemaId: string;
    name: string;
    payload: Record<string, unknown>;
  }) => void;
}) {
  const { language } = useTranslation();
  const ar = language === 'ar';
  const [draft, setDraft] = useState<{
    id?: string;
    expectedVersion?: number;
    schemaId: string;
    name: string;
    payload: Record<string, unknown>;
  }>(() => ({
    schemaId: schemas[0].id,
    name: '',
    payload: emptyCmsField(schemas[0].fieldSchema) as Record<string, unknown>,
  }));
  const schema = schemas.find((item) => item.id === draft.schemaId);
  return (
    <fieldset disabled={disabled} className="space-y-3">
      <label>
        {ar ? 'فتح كتلة للتحرير' : 'Open block for editing'}
        <select
          value={draft.id ?? ''}
          onChange={(event) => {
            const block = blocks.find((item) => item.id === event.target.value);
            if (block)
              setDraft({
                id: block.id,
                expectedVersion: block.version,
                schemaId: block.schemaId,
                name: block.name,
                payload: block.payload,
              });
            else
              setDraft({
                schemaId: schemas[0].id,
                name: '',
                payload: emptyCmsField(schemas[0].fieldSchema) as Record<string, unknown>,
              });
          }}
        >
          <option value="">{ar ? 'كتلة جديدة' : 'New block'}</option>
          {blocks.map((block) => (
            <option key={block.id} value={block.id}>
              {block.name} · v{block.version}
            </option>
          ))}
        </select>
      </label>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (schema) onSave(draft);
        }}
        className="space-y-3"
      >
        <label>
          {ar ? 'المخطط المعتمد' : 'Approved schema'}
          <select
            value={draft.schemaId}
            onChange={(event) => {
              const next = schemas.find((item) => item.id === event.target.value)!;
              setDraft({
                ...draft,
                schemaId: next.id,
                payload: emptyCmsField(next.fieldSchema) as Record<string, unknown>,
              });
            }}
          >
            {schemas.map((item) => (
              <option key={item.id} value={item.id}>
                {ar ? item.nameAr : item.nameEn || item.nameAr} v{item.version}
              </option>
            ))}
          </select>
        </label>
        <label>
          {ar ? 'اسم الكتلة' : 'Block name'}
          <input
            required
            value={draft.name}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          />
        </label>
        {schema && (
          <CmsBlockField
            schema={schema.fieldSchema}
            value={draft.payload}
            onChange={(payload) =>
              setDraft({ ...draft, payload: payload as Record<string, unknown> })
            }
            assetFields={schema.assetFields}
          />
        )}
        <p>
          {ar
            ? 'الحفظ ينشئ مسودة؛ النسخة المنشورة تبقى حتى اعتماد النسخة الجديدة.'
            : 'Saving creates a draft; the published version stays available until the new version is approved.'}
        </p>
        <button type="submit" disabled={!schema}>
          {ar ? 'حفظ مسودة الكتلة' : 'Save block draft'}
        </button>
      </form>
    </fieldset>
  );
}
