import {afterEach,describe,it,expect,vi} from 'vitest';
import {CsrfClientManager} from '@manaratak/shared';
import {ApiClient} from '../../src/api/client';
afterEach(()=>vi.restoreAllMocks());
describe('course preview uses the registered public owner routes',()=>{
 it('reads public preview through the public catalog mount, with encoded identifiers',async()=>{
  const fetch=vi.spyOn(CsrfClientManager.prototype,'fetchWithCsrf').mockResolvedValue(Response.json({course:{id:'c'}}));await ApiClient.getCoursePublicPreview('course/name');expect(fetch.mock.calls[0][0]).toBe('/api/v1/public/courses/course%2Fname/preview?locale=ar');
 });
 it('requests a public-preview grant with the same authenticated CSRF transport, never a student enrollment',async()=>{
  const fetch=vi.spyOn(CsrfClientManager.prototype,'fetchWithCsrf').mockResolvedValue(Response.json({url:'https://media.invalid/short-grant'}));await ApiClient.getCoursePublicPreviewGrant('course','lesson','asset');expect(fetch.mock.calls[0][0]).toBe('/api/v1/public/courses/course/lessons/lesson/assets/asset/preview-delivery-grant');expect(fetch.mock.calls[0][1]?.method).toBe('POST');
 });
});
