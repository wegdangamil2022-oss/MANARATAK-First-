import {EventEmitter} from 'node:events';
import {beforeEach,describe,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({lookup:vi.fn(),request:vi.fn()}));
vi.mock('dns/promises',()=>({lookup:mocks.lookup}));
vi.mock('https',()=>({request:mocks.request}));
import {SafeImportedCourseLinkChecker} from '../../src/courses/SafeImportedCourseLinkChecker';

describe('course verifier pinned DNS lookup contract on Node 22',()=>{
 beforeEach(()=>{vi.clearAllMocks();mocks.lookup.mockResolvedValue([{address:'93.184.216.34',family:4}]);});
 it.each([true,false])('supports lookup all=%s without a second DNS resolution',async all=>{
  mocks.request.mockImplementation((options,respond)=>{
   const req=new EventEmitter() as EventEmitter & {setTimeout:ReturnType<typeof vi.fn>;end:()=>void};
   req.setTimeout=vi.fn();
   req.end=()=>{options.lookup('approved.example',{all},(error,addresses,family)=>{
    expect(error).toBeNull();
    if(all)expect(addresses).toEqual([{address:'93.184.216.34',family:4}]);
    else{expect(addresses).toBe('93.184.216.34');expect(family).toBe(4);}
    respond({statusCode:200,headers:{},destroy:vi.fn()});
   });};
   expect(options.hostname).toBe('approved.example');expect(options.servername).toBe('approved.example');
   return req;
  });
  expect((await new SafeImportedCourseLinkChecker().check({url:'https://approved.example/course/one',allowedDomains:['approved.example']})).state).toBe('VERIFIED_DIRECT');
  expect(mocks.lookup).toHaveBeenCalledOnce();
 });
 it('still refuses an entire DNS response if one address is private',async()=>{
  mocks.lookup.mockResolvedValue([{address:'93.184.216.34',family:4},{address:'127.0.0.1',family:4}]);
  await expect(new SafeImportedCourseLinkChecker().check({url:'https://approved.example/course/one',allowedDomains:['approved.example']})).rejects.toThrow('COURSE_LINK_PRIVATE_DNS_TARGET_BLOCKED');
  expect(mocks.request).not.toHaveBeenCalled();
 });
});
