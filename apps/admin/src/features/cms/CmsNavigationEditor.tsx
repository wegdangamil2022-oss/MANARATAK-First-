import { CmsOwnerPicker } from './CmsOwnerPicker';
import { useEffect, useState } from 'react';
import { ArrowUp, ArrowDown, Plus, Trash2, Pencil, Save, Menu } from 'lucide-react';
import { useTranslation } from '../../i18n/I18nProvider';
import { CmsPublishingPolicy } from '@manaratak/domain';
import { useCmsActionDialog } from './CmsActionDialog';
import { Action, Alert, Status } from './CmsControls';

interface Node {
  id: string;
  parentNodeId?: string | null;
  displayText: string;
  targetType: 'CMS_CONTENT' | 'EXTERNAL_URL' | 'DOMAIN_REFERENCE';
  targetValue: string;
  sortOrder: number;
  openInNewWindow: boolean;
  metadata?: Record<string, unknown> | null;
}
interface MenuRecord {
  id: string;
  locationKey: 'HEADER' | 'FOOTER' | 'SIDEBAR' | 'OTHER';
  status: string;
  version: number;
  nodes: Node[];
}
export function CmsNavigationEditor({
  menus,
  locale,
  disabled,
  canPublish,
  onSave,
  onPublish,
  onDirty,
}: {
  menus: MenuRecord[];
  locale: 'ar' | 'en';
  disabled: boolean;
  canPublish: boolean;
  onSave: (data: {
    id?: string;
    expectedVersion?: number;
    locationKey: MenuRecord['locationKey'];
    nodes: Node[];
  }) => Promise<void>;
  onPublish: (menu: MenuRecord) => Promise<void>;
  onDirty: () => void;
}) {
  const { language } = useTranslation(),
    ar = language === 'ar';
  const [location, setLocation] = useState<MenuRecord['locationKey']>('HEADER');
  const menu = menus.find((item) => item.locationKey === location);
  const [nodes, setNodes] = useState<Node[]>([]),
    [editing, setEditing] = useState(false),
    [error, setError] = useState('');
  const { requestAction, actionDialog } = useCmsActionDialog();
  useEffect(() => {
    setNodes(menu?.nodes.map((node) => ({ ...node })) ?? []);
    setEditing(false);
    setError('');
  }, [menu, locale]);
  const update = (next: Node[]) => {
    onDirty();
    setNodes(next.map((node, index) => ({ ...node, sortOrder: index })));
  };
  const depth = (node: Node) => {
    const visited = new Set<string>();
    let parent = node.parentNodeId,
      level = 0;
    while (parent && !visited.has(parent)) {
      visited.add(parent);
      level++;
      parent = nodes.find((item) => item.id === parent)?.parentNodeId;
    }
    return level;
  };
  const reorder = (index: number, delta: number) => {
    const next = [...nodes];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    update(next);
  };
  const save = async () => {
    setError('');
    try {
      CmsPublishingPolicy.assertAcyclicNavigation(nodes);
      for (const node of nodes) {
        if (!node.displayText.trim() || !node.targetValue.trim()) throw new Error('empty');
        CmsPublishingPolicy.assertSafeNavigationTarget(node.targetType, node.targetValue);
      }
    } catch {
      setError(
        ar
          ? 'تحقق من نصوص الروابط والوجهات الآمنة وعدم وجود دورة في العناصر.'
          : 'Check link labels, safe targets and parent cycles.',
      );
      return;
    }
    await onSave({ id: menu?.id, expectedVersion: menu?.version, locationKey: location, nodes });
  };
  return (
    <div className="cms-navigation-editor">
      <div className="cms-toolbar">
        <label>
          {ar ? 'موضع القائمة' : 'Menu location'}
          <select
            value={location}
            disabled={editing}
            onChange={(event) => setLocation(event.target.value as MenuRecord['locationKey'])}
          >
            {[
              ['HEADER', ar ? 'رأس الموقع' : 'Header'],
              ['FOOTER', ar ? 'تذييل الموقع' : 'Footer'],
              ['SIDEBAR', ar ? 'القائمة الجانبية' : 'Sidebar'],
              ['OTHER', ar ? 'أخرى' : 'Other'],
            ].map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <Status value={menu?.status ?? 'MISSING'} />
        <span>
          {locale.toUpperCase()} · v{menu?.version ?? '—'}
        </span>
        {!editing && !disabled && (
          <Action onClick={() => setEditing(true)}>
            <Pencil size={17} />
            {ar ? (menu ? 'تعديل القائمة' : 'إنشاء قائمة') : menu ? 'Edit menu' : 'Create menu'}
          </Action>
        )}
        {menu?.status === 'DRAFT' && canPublish && !editing && (
          <Action
            onClick={async () => {
              if (
                await requestAction({
                  title: ar ? 'اعتماد ونشر القائمة' : 'Approve and publish menu',
                  description: location + ' · ' + locale + ' · v' + menu.version,
                })
              )
                await onPublish(menu);
            }}
          >
            {ar ? 'اعتماد ونشر القائمة' : 'Approve and publish menu'}
          </Action>
        )}
      </div>
      {error && <Alert tone="error">{error}</Alert>}
      <p className="cms-note">
        {ar
          ? 'حفظ المسودة يحافظ على النسخة العامة السابقة حتى اعتماد النشر الجديد.'
          : 'Saving a draft retains the existing public snapshot until the new menu is approved and published.'}
      </p>
      {!nodes.length && <p>{ar ? 'لا توجد عناصر في هذا الموضع.' : 'No nodes in this location.'}</p>}
      <fieldset disabled={disabled || !editing}>
        <div className="cms-menu-nodes">
          {nodes.map((node, index) => (
            <div key={node.id} className="cms-menu-node" data-depth={Math.min(depth(node), 3)}>
              <div className="cms-node-heading">
                <Menu size={17} />
                <strong>{node.displayText || (ar ? 'رابط جديد' : 'New link')}</strong>
                <span>{node.targetType}</span>
              </div>
              {editing ? (
                <>
                  <label>
                    {ar ? 'نص الرابط' : 'Link label'}
                    <input
                      value={node.displayText}
                      onChange={(event) =>
                        update(
                          nodes.map((item) =>
                            item.id === node.id
                              ? { ...item, displayText: event.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                  </label>
                  <label>
                    {ar ? 'نوع الوجهة' : 'Target type'}
                    <select
                      value={node.targetType}
                      onChange={(event) =>
                        update(
                          nodes.map((item) =>
                            item.id === node.id
                              ? {
                                  ...item,
                                  targetType: event.target.value as Node['targetType'],
                                  targetValue: '',
                                }
                              : item,
                          ),
                        )
                      }
                    >
                      <option value="CMS_CONTENT">{ar ? 'مادة CMS' : 'CMS content'}</option>
                      <option value="DOMAIN_REFERENCE">
                        {ar ? 'مرجع قسم معتمد' : 'Canonical domain reference'}
                      </option>
                      <option value="EXTERNAL_URL">HTTPS</option>
                    </select>
                  </label>
                  {node.targetType === 'CMS_CONTENT' ? (
                    <CmsOwnerPicker
                      type="CMS_CONTENT"
                      value={node.targetValue}
                      disabled={disabled}
                      onChange={(value) =>
                        update(
                          nodes.map((item) =>
                            item.id === node.id ? { ...item, targetValue: value } : item,
                          ),
                        )
                      }
                    />
                  ) : (
                    <label>
                      {ar ? 'الوجهة المعتمدة' : 'Canonical target'}
                      <input
                        dir="ltr"
                        value={node.targetValue}
                        onChange={(event) =>
                          update(
                            nodes.map((item) =>
                              item.id === node.id
                                ? { ...item, targetValue: event.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                    </label>
                  )}
                  <label>
                    {ar ? 'العنصر الأب' : 'Parent node'}
                    <select
                      value={node.parentNodeId ?? ''}
                      onChange={(event) =>
                        update(
                          nodes.map((item) =>
                            item.id === node.id
                              ? { ...item, parentNodeId: event.target.value || null }
                              : item,
                          ),
                        )
                      }
                    >
                      <option value="">{ar ? 'المستوى الرئيسي' : 'Top level'}</option>
                      {nodes
                        .filter((item) => item.id !== node.id)
                        .map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.displayText || '—'}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label className="cms-checkbox">
                    <input
                      type="checkbox"
                      checked={node.openInNewWindow}
                      onChange={(event) =>
                        update(
                          nodes.map((item) =>
                            item.id === node.id
                              ? { ...item, openInNewWindow: event.target.checked }
                              : item,
                          ),
                        )
                      }
                    />
                    {ar ? 'نافذة جديدة' : 'New window'}
                  </label>
                  <div className="cms-actions">
                    <Action disabled={index === 0} onClick={() => reorder(index, -1)}>
                      <ArrowUp size={17} />
                      {ar ? 'أعلى' : 'Up'}
                    </Action>
                    <Action disabled={index === nodes.length - 1} onClick={() => reorder(index, 1)}>
                      <ArrowDown size={17} />
                      {ar ? 'أسفل' : 'Down'}
                    </Action>
                    <Action
                      onClick={async () => {
                        if (
                          await requestAction({
                            title: ar ? 'إزالة الرابط' : 'Remove link',
                            description: node.displayText,
                          })
                        )
                          update(
                            nodes
                              .filter((item) => item.id !== node.id)
                              .map((item) =>
                                item.parentNodeId === node.id
                                  ? { ...item, parentNodeId: null }
                                  : item,
                              ),
                          );
                      }}
                    >
                      <Trash2 size={17} />
                      {ar ? 'إزالة' : 'Remove'}
                    </Action>
                  </div>
                </>
              ) : (
                <p dir="ltr" className="cms-target-value">
                  {node.targetValue}
                </p>
              )}
            </div>
          ))}
        </div>
        {editing && (
          <div className="cms-actions">
            <Action
              disabled={nodes.length >= 200}
              onClick={() =>
                update([
                  ...nodes,
                  {
                    id: crypto.randomUUID(),
                    displayText: '',
                    targetType: 'EXTERNAL_URL',
                    targetValue: '',
                    sortOrder: nodes.length,
                    openInNewWindow: false,
                    parentNodeId: null,
                  },
                ])
              }
            >
              <Plus size={17} />
              {ar ? 'إضافة رابط' : 'Add link'}
            </Action>
            <Action onClick={() => void save()}>
              <Save size={17} />
              {ar ? 'حفظ مسودة القائمة' : 'Save menu draft'}
            </Action>
          </div>
        )}
      </fieldset>
      {actionDialog}
    </div>
  );
}
