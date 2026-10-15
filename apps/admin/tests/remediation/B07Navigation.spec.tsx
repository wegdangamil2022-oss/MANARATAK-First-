import React from 'react';
import { act, create } from 'react-test-renderer';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AdminLink } from '../../src/components/AdminLink';
import { AdminNavigation } from '../../src/components/AdminNavigation';
import { AdminAuthorizationProvider, RequireAdminPermission } from '../../src/security/AdminAuthorizationContext';
import { adminPaths, adminTargets, adminTargetLink, adminPathPermission } from '../../src/navigation/AdminRoutes';
import { auditTargetLink } from '../../src/pages/audit/AuditViewModel';

// Read the production route declarations, including their actual guards, instead of a second route fixture.
const app = ts.createSourceFile('App.tsx', readFileSync('apps/admin/src/App.tsx', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const routes: Array<{ path: string; permission: string; component: string }> = [];
function collect(node: ts.Node) {
  if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && node.tagName.getText(app) === 'Route') {
    const attribute = (name: string) => node.attributes.properties.find(p => ts.isJsxAttribute(p) && p.name.getText(app) === name) as ts.JsxAttribute | undefined;
    const path = attribute('path')?.initializer;
    const element = attribute('element')?.initializer?.getText(app) ?? '';
    const permission = /permission="([^"]+)"/.exec(element)?.[1];
    const component = /<RequireAdminPermission[^>]*>\s*<([A-Za-z0-9]+)/.exec(element)?.[1];
    if (path && ts.isStringLiteral(path) && permission && component) routes.push({ path: path.text, permission, component });
  }
  ts.forEachChild(node, collect);
}
collect(app);
let tree: ReturnType<typeof create>;
beforeEach(() => { (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true; });
afterEach(async () => { if (tree) await act(async () => tree.unmount()); });
const click = { button: 0, defaultPrevented: false, preventDefault() {}, metaKey: false, altKey: false, ctrlKey: false, shiftKey: false };
function Position() { return <output>{useLocation().pathname}</output>; }
async function mount(path: string, permissions: string[], initial = '/admin/scholarships') {
  await act(async () => { tree = create(<MemoryRouter basename="/admin" initialEntries={[initial]}>
    <AdminAuthorizationProvider permissions={permissions}>
      <AdminLink to={path}>Target</AdminLink><Position />
      <Routes>{routes.map(route => <Route key={route.path} path={route.path} element={<RequireAdminPermission permission={route.permission}><p>{route.component}</p></RequireAdminPermission>} />)}
        <Route path="*" element={<p>FALLBACK</p>} /></Routes>
    </AdminAuthorizationProvider>
  </MemoryRouter>); });
}

describe('B07 basename and production permission matrix', () => {
  it.each([
    [adminPaths.referenceData, 'ReferenceDataAdminPage'],
    [adminPaths.universityImport, 'DomainImportCenterPage'],
    [adminPaths.scholarshipImport, 'ScholarshipImportCenterPage'],
    [adminPaths.reviewQueue, 'AdminReviewQueuePage'],
    ['/universities/owner-uuid', 'UniversityRelationshipEditorPage'],
    ['/study-destinations/SA', 'StudyDestinationDetailPage'],
  ])('opens %s through the declared route without dashboard fallback', async (path, component) => {
    await mount(path, ['*']);
    const anchor = tree.root.findByType('a');
    expect(anchor.props.href).toBe('/admin' + path);
    await act(async () => anchor.props.onClick(click));
    expect(JSON.stringify(tree.toJSON())).toContain(component);
    expect(JSON.stringify(tree.toJSON())).not.toContain('FALLBACK');
    expect(tree.root.findByType('output').children.join('')).toBe(path);
  });
  it('hides a forbidden link and guards direct entry', async () => {
    await mount('/imports/universities', ['admin:scholarships:manage'], '/admin/imports/universities');
    expect(tree.root.findAllByType('a')).toHaveLength(0);
    expect(JSON.stringify(tree.toJSON())).not.toContain('DomainImportCenterPage');
    expect(tree.root.findByType('output').children.join('')).toBe('/scholarships');
  });
  it('has no duplicate basename aliases and the target permissions match actual routes', () => {
    expect(routes.some(route => route.path.startsWith('/admin/'))).toBe(false);
    for (const target of Object.values(adminTargets)) {
      expect(adminPathPermission(target.path)).toBe(target.permission);
      expect(routes.some(route => route.path === target.path && route.permission === target.permission)).toBe(true);
      if (target.idKind === 'OWNER_ID') {
        const prefix = 'detailPath' in target ? target.detailPath : target.path;
        expect(routes.some(route => route.path === `${prefix}/:id` && route.permission === target.permission)).toBe(true);
      }
    }
    expect(adminPathPermission('/admin/scholarships')).toBeNull();
    expect(adminPathPermission('/courses/../audit')).toBeNull();
  });
  it('shows reference navigation with its own permission, independently from settings', async () => {
    await act(async () => { tree = create(<MemoryRouter basename="/admin" initialEntries={['/admin/settings/reference-data']}><AdminAuthorizationProvider permissions={['admin:reference-data:manage']}><AdminNavigation /></AdminAuthorizationProvider></MemoryRouter>); });
    const hrefs = tree.root.findAllByType('a').map(a => a.props.href);
    expect(hrefs).toContain('/admin/settings/reference-data');
    expect(hrefs).not.toContain('/admin/settings');
  });
});

describe('B07 owner links do not interchange ID kinds', () => {
  it.each(Object.keys(adminTargets))('requires the target permission for %s', type => {
    expect(adminTargetLink(type, 'owner-uuid', () => false)).toBeNull();
    expect(adminTargetLink(type, 'owner-uuid', () => true)).toBeTruthy();
  });
  it('uses an ISO detail path only with an ISO and otherwise uses the existing list', () => {
    expect(auditTargetLink('STUDY_DESTINATION', 'SA', () => true)).toBe('/study-destinations/SA');
    expect(auditTargetLink('STUDY_DESTINATION', 'profile-uuid', () => true)).toBe('/study-destinations');
    expect(auditTargetLink('COUNTRY_STUDY_PROFILE', 'profile-uuid', () => true)).toBe('/study-destinations');
    expect(adminTargetLink('SERVICE', 'owner-uuid', () => true)).toBe('/services');
    expect(adminTargetLink('EMPLOYER', 'owner-uuid', () => true)).toBe('/careers?tab=employers');
    expect(adminTargetLink('STUDENT_APPLICATION', 'private-id', () => true)).toBeNull();
    expect(adminTargetLink('COURSE', '../audit', () => true)).toBeNull();
  });
});
