import { ApiClient as LiveApiClient, type StudentDashboardSummaryDto, type StudentApplicationTrackerDto, type StudentFinanceInvoiceDto, type StudentServiceRequestDto, type StudentSavedCollectionDto, type StudentWorkspaceSnapshotDto } from '../../api/client';

/**
 * Strictly offline, in-memory simulation of the existing P15 student API.
 * Uses the exact DTOs and renders the *existing* student workspace screens.
 * This module is selected ONLY for VITE_PUBLIC_TEMPLATE_DATA_MODE=prototype.
 * No fallback to a private endpoint is permitted in demo mode.
 * Changes are intentionally discarded on refresh; never save personal data.
 */
const timestamp = '2026-10-20T10:00:00.000Z';
const previewStudentId = 'design-preview-student';
const amount = (number: string) => ({ amountMinorUnits: number, currencyCode: 'USD', scale: 2 });
const saved = (id: string, type: string, entityId: string, name: string, collectionId: string | null = null) => ({
  id, studentReferenceId: previewStudentId, entityType: type, entityId, entitySlug: entityId,
  displayName: name, collectionId, savedAt: timestamp, updatedAt: timestamp,
});
const initialTrackers: StudentApplicationTrackerDto[] = [
  {
    id: 'preview-tracker-csc', studentReferenceId: previewStudentId, scholarshipId: 'csc-china',
    scholarshipSlug: 'csc-china', stage: 'PREPARING_DOCUMENTS', notes: 'أراجع المتطلبات وأجهز شهاداتي.',
    deadlineAt: '2027-03-31T00:00:00Z', status: 'ACTIVE', version: 1,
    createdAt: timestamp, updatedAt: timestamp,
    owner: { id:'csc-china', slug:'csc-china', displayName:'منحة الحكومة الصينية (CSC)', country:'الصين', available: true },
    ownerSnapshot: { displayName:'منحة الحكومة الصينية (CSC)', country:'الصين' },
    checklist: [
      { id:'preview-check-1', trackerId:'preview-tracker-csc', label:'تجهيز جواز السفر', completed:true,position:0,createdAt:timestamp,updatedAt:timestamp },
      { id:'preview-check-2', trackerId:'preview-tracker-csc', label:'ترجمة الشهادة والسجل الأكاديمي', completed:false,position:1,createdAt:timestamp,updatedAt:timestamp },
      { id:'preview-check-3', trackerId:'preview-tracker-csc', label:'إعداد خطة الدراسة', completed:false,position:2,createdAt:timestamp,updatedAt:timestamp },
    ],
  },
  {
    id:'preview-tracker-uk',studentReferenceId:previewStudentId,scholarshipId:'chevening-uk',
    scholarshipSlug:'chevening-uk',stage:'APPLICATION_SUBMITTED',notes:'ملف تجربة للمقارنة فقط.',
    deadlineAt:'2027-10-15T00:00:00Z',status:'ACTIVE',version:1,createdAt:timestamp,updatedAt:timestamp,
    owner:{id:'chevening-uk',slug:'chevening-uk',displayName:'منحة تشيفنينغ البريطانية',country:'المملكة المتحدة',available:true},
    ownerSnapshot:{displayName:'منحة تشيفنينغ البريطانية',country:'المملكة المتحدة'},
    checklist:[{id:'preview-check-4',trackerId:'preview-tracker-uk',label:'صياغة خطاب الدافع',completed:true,position:0,createdAt:timestamp,updatedAt:timestamp}],
  },
];
const initialCollections: StudentSavedCollectionDto[] = [
  {id:'preview-collection-one',studentReferenceId:previewStudentId,name:'منح أتابعها',type:'CUSTOM',itemCount:1,createdAt:timestamp,updatedAt:timestamp},
];
const initialInvoices: StudentFinanceInvoiceDto[] = [{
  id:'preview-invoice-one',publicId:'DEMO-INV-001',invoiceNumber:'DEMO-001',originDomain:'STUDENT_SERVICES',
  originReferenceId:'preview-request-1',studentReferenceId:previewStudentId,status:'ISSUED',
  totalAmount:amount('1500'),amountDue:amount('1500'),lineItems:[
    {description:'استشارة أكاديمية تجريبية',quantity:1,unitPrice:amount('1500'),totalPrice:amount('1500')},
  ],issuedAt:timestamp,dueDate:'2027-01-10T00:00:00Z',updatedAt:timestamp,
}];
const initialRequests: StudentServiceRequestDto[] = [
  {id:'preview-request-1',publicId:'DEMO-REQ-001',studentReferenceId:previewStudentId,serviceId:'academic-consultation',
   status:'REQUESTED',requestParameters:{purpose:'اختيار الجامعة',note:'طلب تجريبي فقط'},createdAt:timestamp,updatedAt:timestamp,version:1},
  {id:'preview-request-2',publicId:'DEMO-REQ-002',studentReferenceId:previewStudentId,serviceId:'sop-review',
   status:'IN_PROGRESS',requestParameters:{purpose:'مراجعة خطاب الدافع'},createdAt:timestamp,updatedAt:timestamp,version:1},
];
const initialDashboard: StudentDashboardSummaryDto = {
  workspace: {
    id:'preview-workspace',studentReferenceId:previewStudentId,displayName:'طالب منارتك (معاينة)',
    preferredLanguage:'ar',timezone:'Asia/Aden',theme:'LIGHT',status:'ACTIVE',version:1,
    notificationMatrix:{inApp:true,email:true,push:false,learning:true,scholarships:true,certificates:true,payments:true},
    privacyPreferences:{retainSearchHistory:true,allowPersonalization:false,allowProductAnalytics:false,publicProfileEnabled:false},
    accessibilityPreferences:{textScale:'DEFAULT',reduceMotion:false,highContrast:false},
    layoutPreferences:{},createdAt:timestamp,updatedAt:timestamp,
  },
  savedItems:[
    saved('preview-saved-1','SCHOLARSHIP','csc-china','منحة الحكومة الصينية (CSC)','preview-collection-one'),
    saved('preview-saved-2','UNIVERSITY','oxford','جامعة أكسفورد'),
    saved('preview-saved-3','COURSE','cs50','مقدمة في علوم الحاسوب'),
  ],
  collections:initialCollections,
  timeline:[
    {id:'preview-event-1',eventType:'SAVED_ITEM',title:'حفظت منحة الحكومة الصينية',occurredAt:timestamp},
    {id:'preview-event-2',eventType:'COURSE_PROGRESS',title:'تابعت درسًا تجريبيًا',occurredAt:'2026-10-18T10:00:00Z'},
  ],
  recentActivity:[
    {id:'preview-event-3',eventType:'VIEWED',title:'استكشفت جامعة أكسفورد',occurredAt:timestamp},
  ],
  courseEnrollments:[
    {enrollmentId:'preview-enrollment-one',courseId:'preview-course-one',courseSlug:'intro-ai',
     courseName:'مدخل إلى الذكاء الاصطناعي',status:'IN_PROGRESS',progressPercentage:45,enrolledAt:'2026-09-20T10:00:00Z',lastAccessedAt:timestamp},
    {enrollmentId:'preview-enrollment-two',courseId:'preview-course-two',courseSlug:'academic-writing',
     courseName:'مهارات الكتابة الأكاديمية',status:'COMPLETED',progressPercentage:100,enrolledAt:'2026-09-01T10:00:00Z',completedAt:'2026-10-10T10:00:00Z'},
  ],
  certificates:[
    {id:'preview-cert-1',publicId:'DEMO-CERT-1',serialNumber:'DEMO-2026-001',
     verificationCode:'DEMO-ONLY',status:'ISSUED',courseDisplayName:'مهارات الكتابة الأكاديمية',issuedAt:'2026-10-10T10:00:00Z'},
  ],
  notifications:[
    {id:'preview-notification-1',category:'COURSES',title:'تابع تقدمك في الدورة',
     message:'هذه رسالة تجريبية لمعاينة التنبيهات.',occurredAt:timestamp},
    {id:'preview-notification-2',category:'SCHOLARSHIPS',title:'راجع متطلبات المنحة',
     message:'مثال إشعار؛ لا يمثل موعد تقديم حقيقيًا.',occurredAt:timestamp},
  ],
  quickActions:[
    {id:'preview-action-1',kind:'SCHOLARSHIPS',label:'استكشاف المنح',description:'تصفح فرصًا مناسبة',href:'/scholarships',priority:1},
    {id:'preview-action-2',kind:'COURSES',label:'استكشاف الدورات',description:'تصفح الدورات',href:'/courses',priority:2},
  ],
  recentlyViewed:[{id:'preview-view-1',entityType:'UNIVERSITY',entityId:'oxford',entitySlug:'oxford',viewedAt:timestamp}],
  widgetRegistry:[],
  statistics:{savedItems:3,activeCourses:1,completedCourses:1,averageCourseProgress:73,certificates:1,unreadNotifications:2},
  certificateCount:1,activeCourseEnrollmentCount:1,completedCourseEnrollmentCount:1,
  capabilityStatus:{notifications:'AVAILABLE',certificates:'AVAILABLE',services:'AVAILABLE',learning:'AVAILABLE'},
  partialFailures:[],
};
let dashboard: StudentDashboardSummaryDto = structuredClone(initialDashboard);
let trackers: StudentApplicationTrackerDto[] = structuredClone(initialTrackers);
let invoices: StudentFinanceInvoiceDto[] = structuredClone(initialInvoices);
let requests: StudentServiceRequestDto[] = structuredClone(initialRequests);
let snapshots: StudentWorkspaceSnapshotDto[] = [{id:'preview-snapshot-one',label:'إعداداتي السابقة',workspaceVersion:1,createdAt:timestamp}];
let careerProfile = {headline:'طالب ومهتم بالبحث العلمي',summary:'ملف مهني تجريبي',skills:['البحث','اللغة الإنجليزية'],version:1};
let alumni = {displayName:'طالب منارتك',visibility:'PRIVATE',version:1};
const copy = <T>(value:T):T => structuredClone(value);
function refreshCounters() {
  dashboard.statistics.savedItems=dashboard.savedItems.length;
  dashboard.statistics.unreadNotifications=dashboard.notifications.filter(x=>!x.readAt).length;
  dashboard.collections=dashboard.collections.map(c=>({...c,itemCount:dashboard.savedItems.filter(x=>x.collectionId===c.id).length}));
}
function changedWorkspace(patch: Record<string, unknown>) {
  dashboard.workspace={...dashboard.workspace,...patch,version:dashboard.workspace.version+1,updatedAt:timestamp};
  return copy(dashboard.workspace);
}
async function callPreviewApi(method: string, ...args: unknown[]): Promise<unknown> {
  const a=args as any[];
  switch (method) {
    case 'getCurrentStudentIdentity':
      return {principalId:previewStudentId,displayName:'طالب منارتك (معاينة)',primaryEmail:'student@example.invalid',roles:['STUDENT']};
    case 'getMyStudentDashboard':refreshCounters();return copy(dashboard);
    case 'getStudentInvoices':return {data:copy(invoices),page:1,total:invoices.length,totalPages:1};
    case 'getStudentInvoicePayments':return [];
    case 'listMyStudentWorkspaceSnapshots':return copy(snapshots);
    case 'listMyHydratedStudentSavedItems':
      return dashboard.savedItems.map(savedItem=>({
        savedItem:copy(savedItem),
        owner:{ownerType:savedItem.entityType,ownerId:savedItem.entityId,slug:savedItem.entitySlug,
        displayName:savedItem.displayName,available:true},
      }));
    case 'listMyStudentApplicationTrackers':return copy(trackers);
    case 'listMyStudentServiceRequests': {
      const filters=a[0] as {status?:string;page?:number}|undefined;
      const selected=requests.filter(r=>!filters?.status||r.status===filters.status);
      return {data:copy(selected),page:1,total:selected.length,totalPages:1};
    }
    case 'getMyStudentServiceRequest':return copy(requests.find(r=>r.id===a[0]||r.publicId===a[0])||requests[0]);
    case 'updateMyStudentApplicationTracker':{
      trackers=trackers.map(t=>t.id===a[0]?{...t,...a[1],version:t.version+1,updatedAt:timestamp}:t);
      return copy(trackers.find(t=>t.id===a[0]));
    }
    case 'updateMyStudentApplicationChecklistItem':{
      trackers=trackers.map(t=>t.id===a[0]?{...t,version:t.version+1,checklist:t.checklist.map(c=>c.id===a[1]?{...c,completed:Boolean(a[2])}:c)}:t);
      return copy(trackers.find(t=>t.id===a[0]));
    }
    case 'archiveMyStudentApplicationTracker':
      trackers=trackers.map(t=>t.id===a[0]?{...t,status:'ARCHIVED',version:t.version+1,archivedAt:timestamp}:t);
      return copy(trackers.find(t=>t.id===a[0]));
    case 'removeMyStudentApplicationTracker':
      trackers=trackers.filter(t=>t.id!==a[0]);return undefined;
    case 'updateMyStudentWorkspace':{
      const {expectedVersion:_v,...patch}=a[0]||{};
      return changedWorkspace(patch);
    }
    case 'updateMyStudentPrivacyConsent':{
      const workspace=changedWorkspace({privacyPreferences:a[0]?.privacyPreferences||{}});
      return {id:'preview-consent',studentReferenceId:previewStudentId,workspaceVersion:workspace.version,
        changedFields:Object.keys(a[0]?.privacyPreferences||{}),afterPreferences:copy(a[0]?.privacyPreferences||{}),decidedAt:timestamp};
    }
    case 'createMyStudentCollection':{
      const input=a[0]||{};const row:StudentSavedCollectionDto={
        id:'preview-collection-'+(dashboard.collections.length+1),studentReferenceId:previewStudentId,
        name:input.name,description:input.description,type:'CUSTOM',color:input.color||'#0E7C86',
        itemCount:0,createdAt:timestamp,updatedAt:timestamp};
      dashboard.collections=[...dashboard.collections,row];return copy(row);
    }
    case 'updateMyStudentCollection':
      dashboard.collections=dashboard.collections.map(c=>c.id===a[0]?{...c,...a[1]}:c);
      return copy(dashboard.collections.find(c=>c.id===a[0]));
    case 'deleteMyStudentCollection':
      dashboard.savedItems=dashboard.savedItems.map(x=>x.collectionId===a[0]?{...x,collectionId:null}:x);
      dashboard.collections=dashboard.collections.filter(x=>x.id!==a[0]);return undefined;
    case 'moveMyStudentSavedItem':
      dashboard.savedItems=dashboard.savedItems.map(x=>x.id===a[0]?{...x,collectionId:a[1]}:x);return undefined;
    case 'removeMyStudentSavedItem':
      dashboard.savedItems=dashboard.savedItems.filter(x=>!(x.entityType===a[0]&&x.entityId===a[1]));return undefined;
    case 'createMyStudentSavedItem':{
      const savedItem=saved('preview-saved-'+(dashboard.savedItems.length+1),a[0]?.entityType||'CERTIFICATE',a[0]?.entityId||'',a[0]?.entityId||'شهادة');
      dashboard.savedItems=[...dashboard.savedItems,savedItem];return copy(savedItem);
    }
    case 'createMyStudentWorkspaceSnapshot':{
      const item={id:'preview-snapshot-'+(snapshots.length+1),label:String(a[0]||'نسخة إعداداتي'),workspaceVersion:dashboard.workspace.version,createdAt:timestamp};
      snapshots=[item,...snapshots];return copy(item);
    }
    case 'restoreMyStudentWorkspaceSnapshot':return changedWorkspace({theme:'LIGHT',accessibilityPreferences:copy(initialDashboard.workspace.accessibilityPreferences)});
    case 'resetMyStudentDashboardLayout':return changedWorkspace({layoutPreferences:{}});
    case 'clearMyStudentSearchHistory':return undefined;
    case 'logoutStudent':return undefined;
    case 'listMyActiveStudentAssets':return {items:[],hasMore:false,nextCursor:null};
    case 'getMyStudentAssetDeliveryGrant':throw new Error('معاينة فقط: لا توجد ملفات شخصية حقيقية.');
    case 'listMyCertificates':return {data:copy(dashboard.certificates),nextCursor:null};
    case 'markStudentNotificationRead':
      dashboard.notifications=dashboard.notifications.map(n=>n.id===a[0]?{...n,readAt:timestamp}:n);
      return undefined;
    case 'careerWorkspaceRequest':{
      const path=String(a[0]||'');const verb=String(a[1]||'GET').toUpperCase();const body=a[2]||{};
      if(path==='profile'){if(verb!=='GET') careerProfile={...careerProfile,...body,version:careerProfile.version+1};return copy(careerProfile);}
      if(path==='alumni'){if(verb!=='GET') alumni={...alumni,...body,version:alumni.version+1};return copy(alumni);}
      if(path.startsWith('applications'))return {data:[],totalPages:1};
      if(path.startsWith('alumni-network'))return {data:[],totalPages:1};
      return {data:[],totalPages:1};
    }
    case 'getMyApplicationDocuments':return {ownerState:'AVAILABLE',entries:[]};
    case 'getScholarshipApplicationCycles':return {cycles:[]};
    case 'listMyServiceAvailability':return {data:[],nextCursor:null};
    case 'listMyServicePackages':return {data:[],nextCursor:null};
    case 'listMyServiceDeliverables':return {data:[],nextCursor:null};
    case 'getMyPrivateToolResult':return {status:'NOT_AVAILABLE',result:null};
    case 'getCareerJobBySlug':return {id:'preview-job',metadata:{applicationChannel:'INTERNAL'},title:'وظيفة تجريبية'};
    // In preview, unsupported *student-private* calls must never fall through to real endpoints.
    default:throw new Error('معاينة تصميم فقط: هذه العملية لا تحفظ بيانات حقيقية ('+method+').');
  }
}
export const PreviewStudentApiClient: typeof LiveApiClient = new Proxy(LiveApiClient, {
  get(_target, property) {
    if (typeof property !== 'string') return undefined;
    return (...args: unknown[]) => callPreviewApi(property, ...args);
  },
});
