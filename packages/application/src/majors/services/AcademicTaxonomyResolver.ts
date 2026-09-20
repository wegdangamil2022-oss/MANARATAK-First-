import { MajorNamingService, iscedFBaselineNodes, MajorDto } from '@manaratak/domain';

export enum TaxonomyResolutionOutcome {
  EXACT_MATCH = 'EXACT_MATCH',
  RESOLVER_GAP = 'RESOLVER_GAP',
  TRUE_TAXONOMY_GAP = 'TRUE_TAXONOMY_GAP',
  AMBIGUOUS = 'AMBIGUOUS',
  REVIEW_REQUIRED = 'REVIEW_REQUIRED',
  ALREADY_MAPPED = 'ALREADY_MAPPED',
  NEEDS_TAXONOMY_EXPANSION = 'TRUE_TAXONOMY_GAP', // legacy alias if used elsewhere
}

export interface TaxonomyResolutionInput {
  academicFieldOrDiscipline?: string;
  collegeOrFaculty?: string;
  facultyName?: string;
  classificationCode?: string;
  sourceClassificationSystem?: string;
  canonicalMajorName?: string;
  catalogKind?: string;
  degreeLevel?: string;
  academicFieldId?: string;
  disciplineId?: string;
}

export interface ResolvedTaxonomyRef {
  id?: string;
  canonicalCode: string;
  canonicalName: string;
  nodeType: 'ACADEMIC_FIELD' | 'DISCIPLINE' | 'PROGRAM_AREA';
}

export interface TaxonomyResolutionResult {
  outcome: TaxonomyResolutionOutcome;
  academicField?: ResolvedTaxonomyRef;
  discipline?: ResolvedTaxonomyRef;
  programArea?: ResolvedTaxonomyRef;
  academicFieldId?: string;
  disciplineId?: string;
  programAreaId?: string;
  academicFieldCode?: string;
  disciplineCode?: string;
  programAreaCode?: string;
  confidence: number;
  reason: string;
  standardType?: string;
  standardCode?: string;
  candidateNodeCodes?: string[];
}

export class AcademicTaxonomyResolver {
  /**
   * Dynamically computes the classification status of a Major
   */
  public static getClassificationStatus(major: Partial<MajorDto>): TaxonomyResolutionOutcome {
    if (major.academicFieldId || major.disciplineId) {
      return TaxonomyResolutionOutcome.EXACT_MATCH;
    }

    const outcome = major.optionalFields?.taxonomyResolutionOutcome;
    if (outcome === TaxonomyResolutionOutcome.AMBIGUOUS || outcome === 'AMBIGUOUS') {
      return TaxonomyResolutionOutcome.AMBIGUOUS;
    }
    if (outcome === TaxonomyResolutionOutcome.TRUE_TAXONOMY_GAP || outcome === 'TRUE_TAXONOMY_GAP' || outcome === 'NEEDS_TAXONOMY_EXPANSION') {
      return TaxonomyResolutionOutcome.TRUE_TAXONOMY_GAP;
    }
    if (outcome === TaxonomyResolutionOutcome.REVIEW_REQUIRED || outcome === 'REVIEW_REQUIRED') {
      return TaxonomyResolutionOutcome.REVIEW_REQUIRED;
    }

    return TaxonomyResolutionOutcome.RESOLVER_GAP;
  }

  private nodeMapByCode: Map<string, { id?: string; canonicalCode: string; canonicalName: string; nodeType: 'ACADEMIC_FIELD' | 'DISCIPLINE' | 'PROGRAM_AREA' }> = new Map();

  constructor(nodes?: Array<{ id?: string; canonicalCode: string; canonicalName: string; nodeType: string }>) {
    if (nodes && nodes.length > 0) {
      this.loadNodes(nodes);
    } else {
      this.loadDefaultBaselineNodes();
    }
  }

  public loadNodes(nodes: Array<{ id?: string; canonicalCode: string; canonicalName: string; nodeType: string }>): void {
    for (const n of nodes) {
      if (['ACADEMIC_FIELD', 'DISCIPLINE', 'PROGRAM_AREA'].includes(n.nodeType)) {
        this.nodeMapByCode.set(n.canonicalCode, {
          id: n.id,
          canonicalCode: n.canonicalCode,
          canonicalName: n.canonicalName,
          nodeType: n.nodeType as any,
        });
      }
    }
  }

  private loadDefaultBaselineNodes(): void {
    this.loadNodes(iscedFBaselineNodes);
  }

  public resolve(input: TaxonomyResolutionInput): TaxonomyResolutionResult {
    // 0. If already mapped
    if (input.academicFieldId || input.disciplineId) {
      return {
        outcome: TaxonomyResolutionOutcome.ALREADY_MAPPED,
        academicFieldId: input.academicFieldId,
        disciplineId: input.disciplineId,
        confidence: 1.0,
        reason: 'Major already possesses canonical taxonomy node references.',
      };
    }

    const name = input.canonicalMajorName || '';
    const fieldOrDisc = input.academicFieldOrDiscipline || '';
    const college = input.collegeOrFaculty || input.facultyName || '';
    const code = input.classificationCode?.trim() || '';

    const combinedText = `${name} ${fieldOrDisc} ${college}`.trim();

    // 1. Check for known ambiguous / interdisciplinary topics
    const ambiguousKeywords = [
      'data science', 'علم البيانات', 'تحليل البيانات', 'البيانات الضخمة', 'علوم البيانات',
      'bioinformatics', 'المعلوماتية الحيوية',
      'business analytics', 'تحليلات الاعمال', 'تحليلات الأعمال', 'تحليل الأعمال',
      'computational biology', 'البيولوجيا الحاسوبية',
      'biomedical engineering', 'الهندسة الطبية الحيوية', 'هندسة طبية', 'هندسة حيوية',
      'health informatics', 'المعلوماتية الصحية',
      'mechatronics', 'ميكاترونكس',
      'cybersecurity', 'الأمن السيبراني', 'الامن السيبراني',
      'artificial intelligence in healthcare', 'الذكاء الاصطناعي الصحي', 'ai in healthcare',
      'decision science', 'علوم القرار',
    ];

    for (const kw of ambiguousKeywords) {
      if (this.containsAny(combinedText, [kw])) {
        return {
          outcome: TaxonomyResolutionOutcome.AMBIGUOUS,
          confidence: 0.5,
          reason: `Subject '${kw}' is interdisciplinary and matches multiple potential classifications; requires manual review.`,
          candidateNodeCodes: ['061', '0613', '071', '091', '04'],
        };
      }
    }

    // 2. Exact authoritative classification code match
    if (code) {
      const codeRes = this.matchByCode(code);
      if (codeRes) return codeRes;
    }

    // 3. Match exact canonical names or aliases against baseline taxonomy nodes
    const nameRes = this.matchByNameOrContext(name, fieldOrDisc, college);
    if (nameRes) return nameRes;

    // 4. Fallback: Needs review or expansion
    if (!combinedText || combinedText === 'unknown') {
      return {
        outcome: TaxonomyResolutionOutcome.REVIEW_REQUIRED,
        confidence: 0.0,
        reason: 'Insufficient source classification context to perform resolution.',
      };
    }

    return {
      outcome: TaxonomyResolutionOutcome.TRUE_TAXONOMY_GAP,
      confidence: 0.0,
      reason: 'No authoritative match found within current ISCED taxonomy baseline (True Taxonomy Gap).',
    };
  }

  private containsAny(text: string, keywords: string[]): boolean {
    if (!text) return false;
    const normText = MajorNamingService.normalizeSearchText(text);
    for (const kw of keywords) {
      const normKw = MajorNamingService.normalizeSearchText(kw);
      if (normKw && normText.includes(normKw)) return true;
    }
    return false;
  }

  private matchByCode(code: string): TaxonomyResolutionResult | null {
    const node = this.nodeMapByCode.get(code);
    if (!node) return null;

    if (node.nodeType === 'PROGRAM_AREA') {
      const discCode = code.substring(0, 3);
      const fieldCode = code.substring(0, 2);
      return this.buildResult(fieldCode, discCode, code, 1.0, `Exact ISCED ${code} program area code match`, 'ISCED', code);
    }
    if (node.nodeType === 'DISCIPLINE') {
      const fieldCode = code.substring(0, 2);
      return this.buildResult(fieldCode, code, undefined, 0.95, `Exact ISCED ${code} discipline code match`, 'ISCED', code);
    }
    if (node.nodeType === 'ACADEMIC_FIELD') {
      return this.buildResult(code, undefined, undefined, 0.90, `Exact ISCED ${code} academic field code match`, 'ISCED', code);
    }
    return null;
  }

  private matchByNameOrContext(name: string, field: string, college: string): TaxonomyResolutionResult | null {
    const combined = `${name} ${field} ${college}`.trim();

    // -------------------------------------------------------------------------
    // 01 EDUCATION
    // -------------------------------------------------------------------------
    if (this.containsAny(combined, ['education science', 'علوم التربية', 'مناهج وتدريس', 'مناهج وطرق تدريس', 'تقنيات التعليم', 'تكنولوجيا التعليم', 'الإدارة التربوية', 'ادارة تربوية', 'قياس وتقويم', 'ارشاد تربوي', 'إرشاد تربوي', 'الإرشاد النفسي والتربوي', 'علم النفس التربوي', 'القياس والتقويم', 'الإشراف التربوي', 'تطوير المناهج'])) {
      return this.buildResult('01', '011', '0111', 0.95, 'Match for Education science (0111)');
    }
    if (this.containsAny(combined, ['pre-school', 'early childhood', 'رياض الاطفال', 'رياض الأطفال', 'طفولة مبكرة'])) {
      return this.buildResult('01', '011', '0112', 0.95, 'Match for Early childhood education (0112)');
    }
    if (this.containsAny(combined, ['special education', 'التربية الخاصة', 'إعاقة', 'اعاقة', 'صعوبات التعلم', 'اضطراب طيف التوحد', 'الموهبة والتفوق', 'التربية الفكرية', 'الإعاقة السمعية', 'الإعاقة البصرية'])) {
      return this.buildResult('01', '011', '0114', 0.95, 'Match for Special education (0114)');
    }
    if (this.containsAny(combined, ['education', 'تربية', 'تعليم', 'تدريس', 'معلم'])) {
      return this.buildResult('01', '011', undefined, 0.90, 'Match for Education (011)');
    }

    // -------------------------------------------------------------------------
    // 02 ARTS AND HUMANITIES
    // -------------------------------------------------------------------------
    if (this.containsAny(combined, ['islamic studies', 'دراسات اسلامية', 'دراسات إسلامية', 'شريعة', 'اصول الدين', 'أصول الدين', 'فقه', 'حديث', 'تفسير', 'عقيدة', 'تلاوة', 'قرآن', 'قران', 'استشراق', 'تراث', 'theology', 'religion'])) {
      return this.buildResult('02', '022', '0221', 0.95, 'Match for Religion and theology / Islamic Studies (0221)');
    }
    if (this.containsAny(combined, ['history', 'تاريخ', 'archaeology', 'آثار', 'اثار', 'متاحف', 'علم المصريات', 'الدراسات الكلاسيكية', 'الدراسات الإقليمية', 'الدراسات الأفريقية', 'الدراسات الآسيوية', 'دراسات الشرق الأوسط', 'الدراسات الأوروبية', 'الدراسات الأمريكية', 'الدراسات اللاتينية', 'حضارات', 'تراث', 'الفولكلور', 'الدراسات الثقافية', 'دراسات الحضارات', 'الدراسات النسوية', 'الجندرية'])) {
      return this.buildResult('02', '022', '0222', 0.95, 'Match for History and archaeology (0222)');
    }
    if (this.containsAny(combined, ['philosophy', 'فلسفة', 'أخلاقيات', 'منطق', 'الأخلاق'])) {
      return this.buildResult('02', '022', '0223', 0.95, 'Match for Philosophy and ethics (0223)');
    }
    if (this.containsAny(combined, ['translation', 'ترجمة', 'english language', 'لغة انجليزية', 'لغة إنجليزية', 'french', 'فرنسية', 'german', 'ألمانية', 'spanish', 'إسبانية', 'chinese', 'صينية', 'لغات أجنبية', 'لغات اوروبية', 'لغات اسيوية'])) {
      return this.buildResult('02', '023', '0231', 0.95, 'Match for Language acquisition (0231)');
    }
    if (this.containsAny(combined, ['arabic language', 'لغة عربية', 'literature', 'ادب', 'أدب', 'linguistics', 'لغويات', 'نقد', 'الكتابة الإبداعية', 'الكتابة المهنية'])) {
      return this.buildResult('02', '023', '0232', 0.95, 'Match for Literature and linguistics (0232)');
    }
    if (this.containsAny(combined, ['languages', 'لغات'])) {
      return this.buildResult('02', '023', undefined, 0.90, 'Match for Languages (023)');
    }
    if (this.containsAny(combined, ['graphic design', 'interior design', 'تصميم داخلي', 'تصميم جرافيكي', 'تصميم أزياء', 'تصميم ازياء', 'تصميم', 'design'])) {
      return this.buildResult('02', '021', '0212', 0.95, 'Match for Design (0212)');
    }
    if (this.containsAny(combined, ['fine arts', 'فنون جميلة', 'رسم', 'نحت', 'خط عربي', 'فنون تشكيلية'])) {
      return this.buildResult('02', '021', '0213', 0.95, 'Match for Fine arts (0213)');
    }
    if (this.containsAny(combined, ['music', 'موسيقى', 'performing arts', 'مسرح', 'سينما'])) {
      return this.buildResult('02', '021', '0215', 0.95, 'Match for Music and performing arts (0215)');
    }
    if (this.containsAny(combined, ['arts', 'فنون', 'humanities', 'اداب', 'آداب'])) {
      return this.buildResult('02', '021', undefined, 0.85, 'Match for Arts (021)');
    }

    // -------------------------------------------------------------------------
    // 03 SOCIAL SCIENCES, JOURNALISM AND INFORMATION
    // -------------------------------------------------------------------------
    if (this.containsAny(combined, ['economics', 'اقتصاد', 'اقتصاد تطبيقي'])) {
      return this.buildResult('03', '031', '0311', 0.95, 'Match for Economics (0311)');
    }
    if (this.containsAny(combined, ['political science', 'علوم سياسية', 'علم السياسة', 'علاقات دولية', 'international relations', 'دراسات استراتيجية', 'العلاقات الدولية', 'الدبلوماسية', 'الدراسات الاستراتيجية', 'دراسات السلام والنزاعات', 'السياسة العامة', 'الحوكمة', 'الشؤون الدولية'])) {
      return this.buildResult('03', '031', '0312', 0.95, 'Match for Political sciences (0312)');
    }
    if (this.containsAny(combined, ['psychology', 'علم نفس', 'علم النفس', 'ارشاد نفسي', 'إرشاد نفسي', 'الإرشاد النفسي', 'صحة نفسية'])) {
      return this.buildResult('03', '031', '0313', 0.95, 'Match for Psychology (0313)');
    }
    if (this.containsAny(combined, ['sociology', 'علم اجتماع', 'علم الاجتماع', 'أنثروبولوجيا', 'anthropology', 'جغرافيا', 'geography', 'ديمغرافيا', 'سكان'])) {
      return this.buildResult('03', '031', '0314', 0.95, 'Match for Sociology and cultural studies (0314)');
    }
    if (this.containsAny(combined, ['journalism', 'صحافة', 'media', 'اعلام', 'إعلام', 'علاقات عامة', 'public relations', 'اتصال الجماهيري', 'إذاعة وتلفزيون', 'إذاعة'])) {
      return this.buildResult('03', '032', '0321', 0.95, 'Match for Journalism and reporting (0321)');
    }
    if (this.containsAny(combined, ['library', 'مكتبات', 'وثائق والمعلومات', 'محتوى رقمي', 'archival'])) {
      return this.buildResult('03', '032', '0322', 0.95, 'Match for Library and archival studies (0322)');
    }
    if (this.containsAny(combined, ['social sciences', 'علوم اجتماعية', 'علوم إنسانية'])) {
      return this.buildResult('03', '031', undefined, 0.90, 'Match for Social and behavioural sciences (031)');
    }

    // -------------------------------------------------------------------------
    // 04 BUSINESS, ADMINISTRATION AND LAW
    // -------------------------------------------------------------------------
    if (this.containsAny(combined, ['accounting', 'محاسبة', 'taxation', 'ضرائب', 'تدقيق حسابات', 'مراجعة حسابات', 'التدقيق والمراجعة'])) {
      return this.buildResult('04', '041', '0411', 0.95, 'Match for Accounting (0411)');
    }
    if (this.containsAny(combined, ['finance', 'مالية', 'تمويل', 'banking', 'مصارف', 'insurance', 'تأمين', 'أسواق مالية', 'استثمار', 'التحليل المالي'])) {
      return this.buildResult('04', '041', '0412', 0.95, 'Match for Finance and banking (0412)');
    }
    if (this.containsAny(combined, ['business administration', 'ادارة اعمال', 'إدارة أعمال', 'management', 'إدارة عامة', 'ادارة عامة', 'موارد بشرية', 'human resources', 'ادارة', 'إدارة', 'سلاسل الإمداد', 'لوجستيات', 'logistics', 'إدارة مشاريع', 'إدارة الجودة', 'اعمال', 'أعمال', 'ريادة أعمال', 'ريادة اعمال', 'عقارات', 'تنمية عقارية', 'عقاري', 'الخدمات اللوجستية', 'المشتريات والتوريد', 'السلوك التنظيمي', 'القيادة', 'الحوكمة والامتثال', 'إدارة الأعمال', 'إدارة سلاسل الإمداد'])) {
      return this.buildResult('04', '041', '0413', 0.95, 'Match for Management and administration (0413)');
    }
    if (this.containsAny(combined, ['marketing', 'تسويق', 'advertising', 'اعلان', 'إعلان', 'تجارة إلكترونية', 'e-commerce', 'المبيعات'])) {
      return this.buildResult('04', '041', '0414', 0.95, 'Match for Marketing (0414)');
    }
    if (this.containsAny(combined, ['law', 'قانون', 'حقوق', 'انظمة', 'أنظمة', 'محاماة'])) {
      return this.buildResult('04', '042', '0421', 0.95, 'Match for Law (0421)');
    }
    if (this.containsAny(combined, ['business', 'ادارة الاعمال', 'تجارة', 'أعمال'])) {
      return this.buildResult('04', '041', undefined, 0.85, 'Match for Business and administration (041)');
    }

    // -------------------------------------------------------------------------
    // 05 NATURAL SCIENCES, MATHEMATICS AND STATISTICS
    // -------------------------------------------------------------------------
    if (this.containsAny(combined, ['biochemistry', 'كيمياء حيوية'])) {
      return this.buildResult('05', '051', '0512', 0.95, 'Match for Biochemistry (0512)');
    }
    if (this.containsAny(combined, ['biology', 'علم الأحياء', 'احياء', 'أحياء', 'microbiology', 'أحياء دقيقة', 'احياء دقيقة', 'zoology', 'علم الحيوان', 'botany', 'علم النبات', 'genetics', 'علم الوراثة', 'biotechnology', 'التقنية الحيوية', 'تقنية حيوية', 'تكنولوجيا حيوية', 'علم الجينوم', 'علم الفيروسات', 'علم الطفيليات', 'علم الفطريات', 'علم الحشرات', 'وراثة', 'خلية', 'خلايا', 'مناعة', 'أنزيمات', 'بروتينات', 'جزيئي', 'جزئي'])) {
      return this.buildResult('05', '051', '0511', 0.95, 'Match for Biology (0511)');
    }
    if (this.containsAny(combined, ['environmental sciences', 'علوم بيئة', 'علوم البيئة', 'علم البيئة', 'إدارة البيئة', 'حماية البيئة', 'علوم المناخ', 'علوم الاستدامة', 'الدراسات البيئية'])) {
      return this.buildResult('05', '052', '0521', 0.95, 'Match for Environmental sciences (0521)');
    }
    if (this.containsAny(combined, ['chemistry', 'كيمياء', 'كيمياء تطبيقية', 'كيمياء صنعتیة'])) {
      return this.buildResult('05', '053', '0531', 0.95, 'Match for Chemistry (0531)');
    }
    if (this.containsAny(combined, ['earth sciences', 'geology', 'جيولوجيا', 'علوم الأرض', 'علوم الارض', 'جيوفيزياء', 'جيوكيمياء', 'ارصاد جوية', 'أرصاد', 'علم الزلازل', 'علم البراكين', 'علم الأحافير', 'علوم الغلاف الجوي', 'علوم المحيطات', 'علوم البحار', 'علوم المياه', 'علوم المواد', 'الاستشعار عن بعد', 'استشعار عن بعد'])) {
      return this.buildResult('05', '053', '0532', 0.95, 'Match for Earth sciences (0532)');
    }
    if (this.containsAny(combined, ['physics', 'فيزياء', 'فيزياء تطبيقية', 'فيزياء طاقة', 'فيزياء نووية', 'فيزياء فلكية', 'astronomy', 'علم الفلك', 'علوم الفضاء'])) {
      return this.buildResult('05', '053', '0533', 0.95, 'Match for Physics (0533)');
    }
    if (this.containsAny(combined, ['mathematics', 'رياضيات', 'رياضيات تطبيقية', 'البحوث التشغيلية', 'التحليل العددي'])) {
      return this.buildResult('05', '054', '0541', 0.95, 'Match for Mathematics (0541)');
    }
    if (this.containsAny(combined, ['statistics', 'إحصاء', 'احصاء', 'إحصاء تطبيقي', 'احصاء تطبيقي', 'علم الاكتوارية', 'القياسات الكمية', 'علوم البيانات الإحصائية'])) {
      return this.buildResult('05', '054', '0542', 0.95, 'Match for Statistics (0542)');
    }
    if (this.containsAny(combined, ['علوم', 'science', 'العلوم العامة'])) {
      return this.buildResult('05', undefined, undefined, 0.80, 'Match for Natural sciences (05)');
    }

    // -------------------------------------------------------------------------
    // 06 INFORMATION AND COMMUNICATION TECHNOLOGIES (ICTS)
    // -------------------------------------------------------------------------
    if (this.containsAny(combined, ['database', 'network design', 'شبكات وقواعد بيانات', 'شبكات الحاسوب', 'شبكات', 'قواعد البيانات', 'أمن الشبكات', 'امان الشبكات', 'أمن المعلومات', 'أدلة جنائية رقمية', 'الأدلة الجنائية الرقمية', 'معلوماتية', 'إنترنت الأشياء', 'انترنت الاشياء', 'الحوسبة السحابية', 'الحوسبة الموزعة', 'الحوسبة عالية الأداء'])) {
      return this.buildResult('06', '061', '0612', 0.95, 'Match for Database and Networks (0612)');
    }
    if (this.containsAny(combined, ['software engineering', 'هندسة البرمجيات', 'software development', 'تطوير البرمجيات', 'تطوير التطبيقات', 'برمجة', 'الذكاء الاصطناعي', 'ذكاء اصطناعي', 'تعلم الآلة', 'تعلم الالة', 'التعلم العميق', 'تطوير الألعاب', 'واقع افتراضي', 'الواقع الافتراضي', 'تطوير تطبيقات الويب', 'تطوير تطبيقات الهاتف', 'نظم المؤسسات', 'حوسبة سحابية', 'الذكاء الحسابي', 'الروبوتات الذكية', 'الحوسبة المتنقلة', 'الحوسبة الرسومية', 'ضمان جودة البرمجيات'])) {
      return this.buildResult('06', '061', '0613', 0.95, 'Match for Software Engineering (0613)');
    }
    if (this.containsAny(combined, ['computer science', 'علوم الحاسب', 'علوم الحاسوب', 'information technology', 'تقنية المعلومات', 'تكنولوجيا المعلومات', 'computing', 'حاسبات ومعلومات', 'حاسوب', 'نظم معلومات حاسوبية', 'نظم المعلومات', 'معلومات', 'حاسبات', 'computer'])) {
      return this.buildResult('06', '061', undefined, 0.90, 'Match for ICT / Computer Science (061)');
    }

    // -------------------------------------------------------------------------
    // 07 ENGINEERING, MANUFACTURING AND CONSTRUCTION
    // -------------------------------------------------------------------------
    if (this.containsAny(combined, ['chemical engineering', 'هندسة كيميائية', 'هندسة كيمياء'])) {
      return this.buildResult('07', '071', '0711', 0.95, 'Match for Chemical engineering (0711)');
    }
    if (this.containsAny(combined, ['electrical engineering', 'هندسة كهربائية', 'power engineering', 'هندسة القوى', 'هندسة كهرباء'])) {
      return this.buildResult('07', '071', '0713', 0.95, 'Match for Electrical engineering (0713)');
    }
    if (this.containsAny(combined, ['electronics engineering', 'هندسة الكترونية', 'هندسة إلكترونية', 'telecommunications', 'اتصالات', 'هندسة الاتصالات', 'هندسة اتصالات'])) {
      return this.buildResult('07', '071', '0714', 0.95, 'Match for Electronics and automation (0714)');
    }
    if (this.containsAny(combined, ['mechanical engineering', 'هندسة ميكانيكية', 'هندسة ميكانيك', 'هندسة سيارات'])) {
      return this.buildResult('07', '071', '0715', 0.95, 'Match for Mechanical engineering (0715)');
    }
    if (this.containsAny(combined, ['aeronautical', 'طيران', 'هندسة الطيران', 'maritime', 'بحرية', 'هندسة بحرية'])) {
      return this.buildResult('07', '071', '0716', 0.95, 'Match for Aeronautical/Maritime engineering (0716)');
    }
    if (this.containsAny(combined, ['industrial engineering', 'هندسة صناعية', 'هندسة الأنظمة الصناعية', 'هندسة التصنيع'])) {
      return this.buildResult('07', '071', '0722', 0.95, 'Match for Industrial engineering and manufacturing (0722)');
    }
    if (this.containsAny(combined, ['food science', 'علوم الأغذية', 'تصنيع غذائي', 'تكنولوجيا الأغذية', 'صناعات غذائية', 'تقنية الأغذية', 'سلامة الغذاء', 'جودة الغذاء', 'تقنية اللحوم', 'تقنية الحبوب', 'أغذية'])) {
      return this.buildResult('07', '072', '0721', 0.95, 'Match for Food processing (0721)');
    }
    if (this.containsAny(combined, ['mining', 'تعدين', 'هندسة التعدين', 'petroleum engineering', 'هندسة بترول', 'هندسة النفط'])) {
      return this.buildResult('07', '072', '0724', 0.95, 'Match for Mining and petroleum engineering (0724)');
    }
    if (this.containsAny(combined, ['architecture', 'عمارة', 'هندسة معمارية', 'تخطيط عمراني', 'تخطيط حضري', 'تخطيط إقليمي', 'urban planning', 'عمارة البيئة', 'تصميم معماري', 'حفاظ معماري', 'التخطيط الحضري', 'التخطيط الإقليمي', 'الحفاظ المعماري'])) {
      return this.buildResult('07', '073', '0731', 0.95, 'Match for Architecture (0731)');
    }
    if (this.containsAny(combined, ['civil engineering', 'هندسة مدنية', 'construction', 'هندسة البناء', 'هندسة تشييد', 'هندسة الطرق', 'تقنية البناء', 'المساحة الكمية'])) {
      return this.buildResult('07', '073', '0732', 0.95, 'Match for Civil engineering (0732)');
    }
    if (this.containsAny(combined, ['engineering', 'هندسة'])) {
      return this.buildResult('07', '071', undefined, 0.90, 'Match for Engineering (071)');
    }

    // -------------------------------------------------------------------------
    // 08 AGRICULTURE, FORESTRY, FISHERIES AND VETERINARY
    // -------------------------------------------------------------------------
    if (this.containsAny(combined, ['veterinary', 'طب بيطري', 'طب البيطري'])) {
      return this.buildResult('08', '084', '0841', 0.95, 'Match for Veterinary medicine (0841)');
    }
    if (this.containsAny(combined, ['agronomy', 'إنتاج نباتي', 'الإنتاج النباتي', 'انتاج نباتي', 'إنتاج حيواني', 'الإنتاج الحيواني', 'انتاج حيواني', 'وقاية النبات', 'علوم الأراضي', 'علوم التربة', 'علوم زراعية', 'agriculture', 'زراعة', 'علوم الألبان', 'علوم الخيول', 'علوم الدواجن', 'تغذية الحيوان', 'المحاصيل الحقلية', 'البساتين', 'نباتات الزينة', 'أمراض النبات', 'الحشرات الزراعية', 'الأعشاب والمبيدات', 'الإرشاد الزراعي', 'الميكنة الزراعية', 'الري والصرف'])) {
      return this.buildResult('08', '081', '0811', 0.95, 'Match for Crop and livestock production / Agriculture (0811)');
    }
    if (this.containsAny(combined, ['fisheries', 'مصايد الأسماك', 'الأسماك', 'استزراع مائي'])) {
      return this.buildResult('08', '083', '0831', 0.95, 'Match for Fisheries (0831)');
    }

    // -------------------------------------------------------------------------
    // 09 HEALTH AND WELFARE
    // -------------------------------------------------------------------------
    if (this.containsAny(combined, ['dental', 'طب أسنان', 'طب الاسنان', 'أسنان', 'اسنان', 'dentistry', 'صحة الفم والأسنان', 'علوم الفم والأسنان', 'تقنية الأسنان', 'صناعة الأسنان', 'صحة الأسنان', 'العلاج السني', 'التعويضات السنية', 'علاج سني'])) {
      return this.buildResult('09', '091', '0911', 0.95, 'Match for Dental studies (0911)');
    }
    if (this.containsAny(combined, ['medicine', 'الطب', 'طب بشرى', 'general medicine', 'الطب والجراحة', 'human medicine', 'الطب العام', 'الطب البشري', 'تشريح', 'وظائف الأعضاء', 'علم الأمراض', 'الأنسجة', 'الأجنة', 'علم الأعصاب', 'علوم عصبية', 'علم السموم', 'anatomy', 'physiology', 'pathology', 'histology', 'embryology', 'neuroscience', 'العلوم العصبية السريرية'])) {
      return this.buildResult('09', '091', '0912', 0.95, 'Match for Medicine (0912)');
    }
    if (this.containsAny(combined, ['nursing', 'تمريض', 'القبالة', 'قبالة', 'midwifery'])) {
      return this.buildResult('09', '091', '0913', 0.95, 'Match for Nursing and midwifery (0913)');
    }
    if (this.containsAny(combined, ['medical lab', 'مختبرات طبية', 'علوم طبية مخبرية', 'تقنية المختبرات', 'radiography', 'أشعة', 'تصوير طبي', 'تقنية الأشعة', 'أشعة تشخيصية', 'التصوير بالرنين المغناطيسي', 'الموجات فوق الصوتية', 'العلاج الإشعاعي', 'تقنية التخدير', 'تقنية العمليات الجراحية', 'تقنية التنفس', 'غسيل الكلى', 'قياس البصر', 'بصريات', 'سمع', 'تشخيص جزيئي', 'علم الخلايا', 'تقنية القلب', 'التروية القلبية', 'علم الدم ونقل الدم', 'الإسعاف', 'الرعاية قبل المستشفى', 'إسعاف', 'طوارئ', 'الطوارئ'])) {
      return this.buildResult('09', '091', '0914', 0.95, 'Match for Medical diagnostic and treatment technology (0914)');
    }
    if (this.containsAny(combined, ['physical therapy', 'علاج طبيعي', 'علاج وظيفي', 'تأهيل صحي', 'طرف صناعي', 'أطراف صناعية', 'rehabilitation', 'العلاج الرياضي', 'العلاج الحركي', 'علم الحركة', 'ميكانيكا حيوية', 'العلاج التنفسي', 'النطق واللغة', 'السمع والنطق', 'العلاج الوظيفي', 'الأطراف الصناعية', 'الميكانيكا الحيوية'])) {
      return this.buildResult('09', '091', '0915', 0.95, 'Match for Therapy and rehabilitation (0915)');
    }
    if (this.containsAny(combined, ['pharmacy', 'الصيدلة', 'pharmaceutical', 'العلوم الصيدلية', 'العلوم الصيدلانية', 'صيدلة', 'علم الأدوية', 'pharmacology', 'عقاقير', 'صيدلانية', 'تيقظ دوائي', 'تنظيم الدواء', 'سلامة الدواء', 'مستحضرات صيدلانية', 'الأدوية والسموم'])) {
      return this.buildResult('09', '091', '0916', 0.95, 'Match for Pharmacy (0916)');
    }
    if (this.containsAny(combined, ['social work', 'خدمة اجتماعية', 'الخدمة الاجتماعية', 'رعاية اجتماعية', 'الرعاية الاجتماعية'])) {
      return this.buildResult('09', '092', '0923', 0.95, 'Match for Social work (0923)');
    }
    if (this.containsAny(combined, ['صحة عامة', 'public health', 'إدارة صحية', 'معلوماتية صحية', 'سياسات صحية', 'health', 'الصحة', 'medical sciences', 'العلوم الطبية', 'وبائيات', 'التثقيف والتعزيز الصحي', 'مكافحة العدوى', 'سلامة المرضى', 'صحة المجتمع', 'صحة الأم والطفل', 'رعاية صحية', 'التغذية البشرية', 'التغذية العلاجية', 'تغذية علاجية', 'تغذية'])) {
      return this.buildResult('09', '091', '0917', 0.95, 'Match for Public health (0917)');
    }

    // -------------------------------------------------------------------------
    // 10 SERVICES
    // -------------------------------------------------------------------------
    if (this.containsAny(combined, ['hotel', 'فندقة', 'إدارة الفنادق', 'ضيافة', 'hospitality', 'طهي', 'خدمة الطعام'])) {
      return this.buildResult('10', '101', '1013', 0.95, 'Match for Hotel and catering (1013)');
    }
    if (this.containsAny(combined, ['sports', 'تربية رياضية', 'علوم الرياضة', 'تدريب رياضي', 'إدارة رياضية', 'physical education'])) {
      return this.buildResult('10', '101', '1014', 0.95, 'Match for Sports (1014)');
    }
    if (this.containsAny(combined, ['tourism', 'سياحة', 'إدارة السياحة', 'ارشاد سياحي', 'إرشاد سياحي'])) {
      return this.buildResult('10', '101', '1015', 0.95, 'Match for Tourism (1015)');
    }
    if (this.containsAny(combined, ['occupational safety', 'سلامة مهنية', 'صحة والسلامة المهنية', 'إدارة أزمات', 'إدارة الكوارث'])) {
      return this.buildResult('10', '102', '1022', 0.95, 'Match for Occupational health and safety (1022)');
    }
    if (this.containsAny(combined, ['military', 'علوم عسكرية', 'علوم أمنية', 'علوم شرَطية', 'علوم شرطية'])) {
      return this.buildResult('10', '103', '1031', 0.95, 'Match for Military and defence (1031)');
    }
    if (this.containsAny(combined, ['aviation', 'طيران مدني', 'علوم الطيران', 'خدمات النقل', 'إدارة النقل', 'transport'])) {
      return this.buildResult('10', '104', '1041', 0.95, 'Match for Transport services (1041)');
    }

    return null;
  }

  private buildResult(
    fieldCode: string,
    discCode?: string,
    progCode?: string,
    confidence = 0.9,
    reason = '',
    standardType = 'ISCED',
    standardCode?: string
  ): TaxonomyResolutionResult {
    const field = this.nodeMapByCode.get(fieldCode);
    const disc = discCode ? this.nodeMapByCode.get(discCode) : undefined;
    const prog = progCode ? this.nodeMapByCode.get(progCode) : undefined;

    return {
      outcome: TaxonomyResolutionOutcome.EXACT_MATCH,
      academicField: field ? { id: field.id, canonicalCode: field.canonicalCode, canonicalName: field.canonicalName, nodeType: 'ACADEMIC_FIELD' } : undefined,
      discipline: disc ? { id: disc.id, canonicalCode: disc.canonicalCode, canonicalName: disc.canonicalName, nodeType: 'DISCIPLINE' } : undefined,
      programArea: prog ? { id: prog.id, canonicalCode: prog.canonicalCode, canonicalName: prog.canonicalName, nodeType: 'PROGRAM_AREA' } : undefined,
      academicFieldId: field?.id,
      disciplineId: disc?.id,
      programAreaId: prog?.id,
      academicFieldCode: fieldCode,
      disciplineCode: discCode,
      programAreaCode: progCode,
      confidence,
      reason,
      standardType,
      standardCode: standardCode || progCode || discCode || fieldCode,
    };
  }
}
