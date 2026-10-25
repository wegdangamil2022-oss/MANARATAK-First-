import { describe, expect, it } from 'vitest';
import { catalogQuery, changeCatalogFilters, certificateFact, studyFact } from '../../src/features/courses/catalogState';

describe('course catalog facts and query scope', () => {
  it('clears hidden external filters when moving to native without dropping search or access', () => {
    const next = changeCatalogFilters(new URLSearchParams('scope=external&provider=prov-1&linkHealth=BROKEN&completenessStatus=INCOMPLETE&q=arabic&studyAccess=FREE&page=7&view=cards'), { scope: 'native' });
    expect(next.get('provider')).toBeNull();
    expect(next.get('linkHealth')).toBeNull();
    expect(next.get('completenessStatus')).toBeNull();
    expect(next.get('q')).toBe('arabic');
    expect(next.get('studyAccess')).toBe('FREE');
    expect(next.get('page')).toBeNull();
    expect(next.get('view')).toBe('cards');
  });
  it('constrains provider results to external and keeps paid access separate from paid origin', () => {
    const query = catalogQuery(new URLSearchParams('provider=prov-1&studyAccess=PAID&view=cards&pageSize=500&page=-2'));
    expect(query.get('originType')).toBe('EXTERNAL_LINKED_COURSE');
    expect(query.get('studyAccess')).toBe('PAID');
    expect(query.get('pageSize')).toBe('20');
    expect(query.get('page')).toBe('1');
    expect(query.has('view')).toBe(false);
  });
  it('does not turn a false free certificate fact into no certificate', () => {
    expect(certificateFact({ originType: 'EXTERNAL_LINKED_COURSE', isFreeCertificate: false })).toBe('UNKNOWN');
    expect(certificateFact({ originType: 'EXTERNAL_LINKED_COURSE', isFreeCertificate: false, certificateAvailable: true })).toBe('NON_FREE');
    expect(certificateFact({ originType: 'EXTERNAL_LINKED_COURSE', certificateAvailable: false })).toBe('UNAVAILABLE');
    expect(certificateFact({ originType: 'EXTERNAL_LINKED_COURSE', isFreeCertificate: true })).toBe('FREE');
  });
  it('does not infer free external study or free native certificates from provider/access alone', () => {
    expect(studyFact({ originType: 'EXTERNAL_LINKED_COURSE', accessType: 'FREE_STUDY' })).toBe('UNKNOWN');
    expect(studyFact({ originType: 'NATIVE_MANARATAK_COURSE', accessType: 'FREE_CERTIFICATE' })).toBe('UNKNOWN');
    expect(studyFact({ originType: 'NATIVE_MANARATAK_COURSE', accessType: 'PAID' })).toBe('PAID');
    expect(certificateFact({ originType: 'NATIVE_MANARATAK_COURSE', accessType: 'FREE_STUDY_AND_CERTIFICATE' })).toBe('UNKNOWN');
    expect(certificateFact({ originType: 'NATIVE_MANARATAK_COURSE', accessType: 'FREE_STUDY_AND_CERTIFICATE', certificateAvailable: true })).toBe('FREE');
    expect(certificateFact({ originType: 'NATIVE_MANARATAK_COURSE', accessType: 'PAID', certificateAvailable: true })).toBe('UNKNOWN');
  });
  it('switches presentation without changing the server query', () => {
    expect(catalogQuery(new URLSearchParams('view=cards&page=4&q=arabic')).toString())
      .toBe(catalogQuery(new URLSearchParams('view=table&page=4&q=arabic')).toString());
  });
});
