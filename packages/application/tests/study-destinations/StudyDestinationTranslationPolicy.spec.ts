import { describe, it, expect } from 'vitest';
import { assertStudyDestinationTranslationUnchanged } from '../../src/study-destinations/StudyDestinationTranslationPolicy';
describe('study destination translation boundary', () => {
  const previous={overviewAr:'عربي',overviewEn:'English | retained',visaRequirementsEn:['passport'],costHighlightsEn:[{label:'rent | source',value:'100 | monthly'}],officialLinks:[{labelAr:'جهة',labelEn:'Authority',url:'https://example.gov',category:'OTHER' as const}]};
  it('permits an Arabic card edit and a full unchanged English round trip',()=>{
    expect(()=>assertStudyDestinationTranslationUnchanged(previous,{...previous,overviewAr:'تعديل'})).not.toThrow();
    expect(()=>assertStudyDestinationTranslationUnchanged(previous,{visaSummaryAr:'نص'})).not.toThrow();
  });
  it('rejects authoring, clearing and changing nested English labels from any owner command',()=>{
    for(const input of [{overviewEn:'changed'},{overviewEn:null},{visaRequirementsEn:[]},{costHighlightsEn:[]},{officialLinks:[]}])
      expect(()=>assertStudyDestinationTranslationUnchanged(previous,input)).toThrow('TRANSLATION_CONTENT_AUTHORING_DISABLED');
    expect(()=>assertStudyDestinationTranslationUnchanged(null,{overviewEn:'new'})).toThrow('TRANSLATION_CONTENT_AUTHORING_DISABLED');
  });
  it('allows a structural source addition without fabricated English content',()=>{
    expect(()=>assertStudyDestinationTranslationUnchanged(previous,{officialLinks:[...previous.officialLinks,{labelAr:'أخرى',url:'https://other.gov',category:'OTHER'}]})).not.toThrow();
  });
  it('does not accept whitespace edits to protected English link labels',()=>{
    expect(()=>assertStudyDestinationTranslationUnchanged(previous,{officialLinks:[{...previous.officialLinks[0],labelEn:' Authority '}]})).toThrow('TRANSLATION_CONTENT_AUTHORING_DISABLED');
  });
});
