/** Reviewed source relationships. Exact normalized aliases and explicit names
 * only: no fuzzy matching, invented entities, or expansion of "all majors". */
export const normalizeScholarshipLabel = value => String(value ?? '').normalize('NFKC')
  .replace(/[\u064B-\u065F\u0670\u0640]/gu, '').replace(/[أإآٱ]/gu, 'ا')
  .toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const active = row => !['ARCHIVED', 'REJECTED', 'DELETED', 'INACTIVE'].includes(row.status) && row.isActive !== false && (!row.lifecycleState || row.lifecycleState === 'ACTIVE');
function index(rows, labels) {
  const map = new Map();
  for (const row of rows.filter(active)) for (const label of labels(row).filter(value => typeof value === 'string' && value.trim())) {
    const key = normalizeScholarshipLabel(label); if (!key) continue;
    const values = map.get(key) ?? []; if (!values.some(value => value.id === row.id)) values.push(row); map.set(key, values);
  }
  return map;
}
function mentions(text, aliases, { minimum = 3 } = {}) {
  const haystack = ' ' + normalizeScholarshipLabel(text) + ' ', matches = [];
  for (const [label, rows] of aliases) {
    if (label.length < minimum) continue;
    for (const prefix of /^[\u0600-\u06ff]/u.test(label) ? [' ', ' و'] : [' ']) {
      let position = haystack.indexOf(prefix + label + ' ');
      while (position >= 0) { matches.push({ label, rows, position, end: position + prefix.length + label.length + 1 }); position = haystack.indexOf(prefix + label + ' ', position + 1); }
    }
  }
  // E.g. "computer engineering" must not also select "engineering".
  return matches.filter(item => !matches.some(other => other !== item && other.position <= item.position && other.end >= item.end && other.label.length > item.label.length));
}
export function scholarshipSourceRelationPort(tables, reviewedSources = []) {
  const majors = tables.major.filter(active), profiles = tables.majorLevelProfile ?? [], majorById = new Map(majors.map(row => [row.id, row]));
  const majorLabels = index(majors, row => [row.canonicalName, row.displayName, row.localizedNameAr, row.localizedNameEn]);
  for (const alias of tables.majorAlias ?? []) {
    const row = majorById.get(alias.majorId), key = normalizeScholarshipLabel(alias.alias); if (!row || !key) continue;
    const values = majorLabels.get(key) ?? []; if (!values.some(value => value.id === row.id)) values.push(row); majorLabels.set(key, values);
  }
  const degrees = index(tables.degreeLevel, row => [row.nameAr, row.nameAr ? 'ال' + row.nameAr : '', row.nameEn, row.canonicalCode, ...(Array.isArray(row.aliases) ? row.aliases : [])]);
  const countries = index(tables.referenceCountry, row => [row.nameAr, row.name, row.officialName]);
  const languages = index(tables.referenceLanguage, row => [row.nameAr, row.name, row.nativeName]);
  const universities = index(tables.university, row => [row.canonicalName, row.displayName,
    row.optionalFields?.localizedNameAr, row.optionalFields?.localizedNameEn,
    row.optionalFields?.nameAr, row.optionalFields?.nameEn,
    row.optionalFields?.localizedNames?.ar, row.optionalFields?.localizedNames?.en]);
  const host = value => { try { return new URL(value).hostname.toLowerCase().replace(/^www\./u, ''); } catch { return ''; } };
  const sites = tables.university.filter(active).map(row => ({row, host:host(row.officialWebsite)})).filter(item => item.host);
  const providerFromSite = source => {
    if (!/جامعة|معهد|university|college|institute/iu.test(source.providerName ?? '')) return null;
    const sourceHost=host(source.officialSourceUrl);if(!sourceHost)return null;
    const candidates=sites.filter(item=>sourceHost===item.host || sourceHost.endsWith('.'+item.host));
    return candidates.length===1?candidates[0].row:null;
  };
  // Learn bilingual aliases only from an explicit source provider and its
  // unique institution website. Conflicting aliases remain ambiguous.
  for(const source of reviewedSources){const row=providerFromSite(source);if(!row)continue;const key=normalizeScholarshipLabel(source.providerName);const values=universities.get(key)??[];if(!values.some(item=>item.id===row.id))values.push(row);universities.set(key,values);}
  const tests = index(tables.internationalTest, row => [row.canonicalName, row.displayName, row.abbreviation,
    ...String(row.displayName??'').match(/[A-Za-z][A-Za-z0-9®'()/. –—-]*/gu)??[]]);
  const testById = new Map(tables.internationalTest.filter(active).map(row => [row.id, row]));
  const one = (aliases, text) => { const found = aliases.get(normalizeScholarshipLabel(text)); return found?.length === 1 ? found[0] : null; };
  return { async link(data, source) {
    const degreeMatches = mentions(source.degreeLevel, degrees).filter(item => item.rows.length === 1);
    const degreeRows = [...new Map(degreeMatches.map(item => [item.rows[0].id, item])).values()];
    const degreeIds = degreeRows.map(item => item.rows[0].id);
    const degreeTargets = degreeRows.length ? degreeRows.map((item, n) => ({ targetKey: `source-degree-${n + 1}`, degreeLevelId: item.rows[0].id,
      sourceLabel: item.rows[0].nameAr ?? item.rows[0].nameEn, resolutionStatus: 'RESOLVED', metadata: { originalSourceLabel: source.degreeLevel, method: 'EXPLICIT_SOURCE_NAME' } })) : data.degreeTargets;
    const majorTargets = [], seen = new Set(), unresolvedMajors = [];
    for (const [n, label] of (Array.isArray(source.eligibleMajorsOrFields) ? source.eligibleMajorsOrFields : source.eligibleMajorsOrFields ? [source.eligibleMajorsOrFields] : []).entries()) {
      const positive = label.split(/باستثناء|عدا |لا تشمل|excluding|except/iu)[0];
      let linked = false;
      for (const match of mentions(positive, majorLabels, { minimum: 4 })) {
        let candidates = match.rows;
        if (candidates.length > 1 && degreeIds.length) candidates = candidates.filter(row => profiles.some(profile => profile.majorId === row.id && degreeIds.includes(profile.degreeLevelId) && active(profile)));
        if (candidates.length !== 1) continue;
        const row = candidates[0], key = `${n}|${row.id}`; if (seen.has(key)) continue; seen.add(key); linked = true;
        majorTargets.push({ targetKey: `source-major-${n + 1}-${majorTargets.length + 1}`, majorId: row.id, sourceLabel: label, resolutionStatus: 'RESOLVED',
          metadata: { matchedAlias: match.label, degreeLevelIds: degreeIds, method: 'EXPLICIT_SOURCE_ALIAS' } });
      }
      if (!linked) { unresolvedMajors.push(label); majorTargets.push({ targetKey: `source-major-${n + 1}-unresolved`, majorId: null, sourceLabel: label, resolutionStatus: 'SOURCE_ONLY' }); }
    }
    const country = one(countries, source.studyCountry), language = one(languages, source.studyLanguage);
    const provider = one(universities, source.providerName) ?? providerFromSite(source);
    const universityLinks = (data.universityLinks ?? []).map(link => { const row = one(universities, link.sourceLabel); return row ? { ...link, universityId: row.id, resolutionStatus: 'RESOLVED' } : link; });
    const sections = source.metadata?.rawSourceSections ?? {}, testsFound = new Map();
    const scanTests = text => {
      const found = [];
      for (const match of mentions(text, tests)) {
        if (match.rows.length !== 1) continue; const row = match.rows[0];
        found.push(row); testsFound.set(row.id, { id: row.id, publicId: row.publicId, name: row.displayName ?? row.canonicalName, sourceText: text, relationship: 'MENTIONED_IN_SOURCE' });
      }
      return [...new Map(found.map(row => [row.id, row])).values()];
    };
    const eligibilityItems = data.eligibilityItems?.map(item => { const found = scanTests(item.valueText ?? ''); return found.length === 1 ? { ...item, internationalTestId: found[0].id, resolutionStatus: 'RESOLVED' } : item; });
    const requiredDocumentItems = data.requiredDocumentItems?.map(item => { const found = scanTests(item.displayName); return found.length === 1 ? { ...item, internationalTestId: found[0].id, resolutionStatus: 'RESOLVED' } : item; });
    for (const [title, text] of Object.entries(sections)) if (/لغة|شروط|معايير|مستند|ملاحظات/u.test(title)) scanTests(text);
    scanTests(source.studyLanguage ?? '');
    return {
      countryReferenceId: country?.id ?? data.countryReferenceId, studyLanguageReferenceId: language?.id ?? data.studyLanguageReferenceId,
      studyLanguageResolutionStatus: language ? 'RESOLVED' : data.studyLanguageResolutionStatus,
      sponsorUniversityId: provider?.id ?? data.sponsorUniversityId,
      degreeTargets, majorTargets, universityLinks, eligibilityItems, requiredDocumentItems,
      metadata: { ...data.metadata, sourceRelationships: { version: 1, method: 'EXPLICIT_SOURCE_ALIAS',
        testIds: [...testsFound.keys()].filter(id => testById.has(id)), tests: [...testsFound.values()], unresolvedMajorDescriptions: unresolvedMajors } },
    };
  } };
}
