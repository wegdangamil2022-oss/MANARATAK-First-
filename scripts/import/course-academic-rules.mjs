/** Reviewed subject rules. A provider, teaching language, certificate or degree
 * level is never evidence of an academic subject. Broad subjects deliberately
 * carry no major targets. Targets are existing exact major identities only. */
export const COURSE_ACADEMIC_RULE_VERSION = '2026-11-06-v2';
const rule = (id, code, pattern, majors = [], exclude) => ({ id, code, pattern, majors, exclude });
export const COURSE_ACADEMIC_RULES = [
  rule(
    'software',
    '0613',
    'programming|software development|software engineering|web development|javascript|typescript|python|java|c\\+\\+|c#|html|css|react|angular|node\\.?js|coding|algorithms|data structures|git|github|devops|برمجة|تطوير البرمجيات',
    ['Computer Science', 'Software Engineering', 'Computer Programming', 'Web Development'],
  ),
  rule(
    'ai',
    '0613',
    'artificial intelligence|machine learning|deep learning|generative ai|neural networks|natural language processing|computer vision|الذكاء الاصطناعي|تعلم الآلة',
    ['Artificial Intelligence', 'Data Science', 'Computer Science'],
  ),
  rule(
    'data-science',
    '0613',
    'data science|data engineering|big data|pandas|apache spark|علوم البيانات',
    ['Data Science', 'Data Analytics', 'Computer Science'],
  ),
  rule(
    'statistics',
    '0542',
    'statistics|statistical|probability|data analysis|data analytics|business analytics|biostatistics|regression analysis|احصاء|تحليل البيانات',
    ['Statistics', 'Data Science', 'Data Analytics', 'Business Analytics'],
  ),
  rule(
    'cyber',
    '0612',
    'cybersecurity|cyber security|information security|network security|ethical hacking|penetration testing|firewall|cryptography|microsoft defender|fortinet|threat detection|zero trust|امن المعلومات|الامن السيبراني',
    ['Cybersecurity', 'Information Security', 'Computer Networks', 'Network Engineering'],
  ),
  rule(
    'cloud-network',
    '0612',
    'cloud computing|cloud infrastructure|azure|amazon web services|aws|google cloud|computer networks|networking|cisco|linux|windows server|kubernetes|docker|network administration|الحوسبة السحابية|شبكات الحاسوب',
    ['Information Technology', 'Computer Networks', 'Network Engineering', 'Cloud Computing'],
  ),
  rule(
    'database',
    '0612',
    'database|databases|sql|postgresql|mysql|mongodb|data warehouse|قواعد البيانات',
    ['Computer Science', 'Information Systems', 'Computer Information Systems', 'Data Science'],
  ),
  rule(
    'office',
    '0611',
    'microsoft excel|excel|microsoft word|powerpoint|office 365|microsoft 365|google sheets|computer basics|digital literacy|اكسل|مهارات الحاسوب',
  ),
  rule(
    'accounting',
    '0411',
    'accounting|bookkeeping|financial statements|taxation|auditing|محاسبة|المحاسبة',
    ['Accounting', 'Accounting and Finance'],
  ),
  rule(
    'finance',
    '0412',
    'finance|financial management|financial analysis|banking|investment|insurance|fintech|التمويل|الاستثمار|الخدمات المصرفية',
    ['Finance', 'Banking and Finance', 'Accounting and Finance', 'Financial Technology'],
  ),
  rule('economics', '0311', 'economics|microeconomics|macroeconomics|econometrics|الاقتصاد', [
    'Economics',
    'Applied Economics',
    'Econometrics',
  ]),
  rule(
    'business-management',
    '0413',
    'business administration|business management|project management|entrepreneurship|organizational management|strategic management|operations management|ادارة الاعمال|ريادة الاعمال|ادارة المشاريع',
    [
      'Business Administration',
      'Management',
      'Project Management',
      'Entrepreneurship',
      'Management Science',
    ],
  ),
  rule(
    'human-resources',
    '0413',
    'human resources|human resource management|recruitment|talent management|الموارد البشرية',
    ['Human Resource Management', 'Human Resources Management', 'Business Administration'],
  ),
  rule(
    'marketing',
    '0414',
    'marketing|advertising|search engine optimization|seo|digital marketing|brand management|التسويق|الاعلان',
    ['Marketing', 'Digital Marketing', 'Advertising', 'Advertising Management'],
  ),
  rule(
    'commerce',
    '0416',
    'e-commerce|ecommerce|retail|sales management|shopify|التجارة الالكترونية|المبيعات',
    ['E-Commerce', 'Electronic Commerce', 'Marketing', 'Business Administration'],
  ),
  rule(
    'business-general',
    '041',
    'business|administration|الاعمال',
    [],
    'azure|database|server|network|clinical|patient|medical',
  ),
  rule(
    'personal-skills',
    '0031',
    'personal development|professional skills|communication|critical thinking|problem solving|time management|career development|soft skills|التطوير الذاتي|مهارات التواصل',
  ),
  rule(
    'education',
    '011',
    'education|teaching|pedagogy|instructional design|learning design|classroom|curriculum|teacher|التربية|التعليم|التدريس',
    ['Education', 'Educational Sciences', 'Educational Technology', 'Curriculum and Instruction'],
  ),
  rule(
    'early-education',
    '0112',
    'early childhood education|preschool teaching|kindergarten|رياض الاطفال',
    ['Early Childhood Education', 'Kindergarten Education'],
  ),
  rule('language-general', '023', 'languages|language learning|language acquisition|تعلم اللغات'),
  rule(
    'english-language',
    '0231',
    'english language|english grammar|business english|learn english|اللغة الانجليزية',
    ['English Language', 'English Language and Literature', 'English Studies'],
  ),
  rule('translation', '0231', 'translation|interpreting|الترجمة', [
    'Translation',
    'Translation and Interpretation',
  ]),
  rule('linguistics', '0232', 'linguistics|literature|literary|اللغويات|الادب', [
    'Linguistics',
    'English Literature',
    'Comparative Literature',
  ]),
  rule('psychology', '0313', 'psychology|psychological|cognitive psychology|علم النفس', [
    'Psychology',
    'Clinical Psychology',
    'Counseling Psychology',
  ]),
  rule(
    'social-sciences',
    '0314',
    'sociology|social sciences|cultural studies|anthropology|علم الاجتماع',
    ['Sociology', 'Anthropology', 'Social Sciences'],
  ),
  rule(
    'social-work',
    '0923',
    'social work|social welfare|social counselling|العمل الاجتماعي|الخدمة الاجتماعية',
    ['Social Work'],
  ),
  rule(
    'politics',
    '0312',
    'political science|politics|international relations|public policy|governance|civic|العلوم السياسية|العلاقات الدولية',
    ['Political Science', 'International Relations', 'Public Policy', 'Public Administration'],
  ),
  rule(
    'law',
    '0421',
    'law|legal|human rights|justice|criminal justice|القانون|حقوق الانسان',
    ['Law', 'Legal Studies', 'Criminal Justice'],
    'ohm|newton|thermodynamics|moore|kepler|faraday|coulomb|gauss|law of attraction',
  ),
  rule(
    'history',
    '0222',
    'history|archaeology|archaeological|التاريخ|الاثار',
    ['History', 'Archaeology'],
    'git|version control|browser|medical history|patient history|credit history|transaction history',
  ),
  rule('philosophy', '0223', 'philosophy|philosophical|ethics|الفلسفة|الاخلاق', ['Philosophy']),
  rule('religion', '0221', 'religion|theology|islamic studies|quran|الدراسات الاسلامية|القرآن', [
    'Islamic Studies',
    'Theology',
    'Religious Studies',
  ]),
  rule('journalism', '0321', 'journalism|journalist|news reporting|الصحافة', [
    'Journalism',
    'Journalism and Mass Communication',
    'Mass Communication',
  ]),
  rule('library', '0322', 'library science|archival studies|librarianship|المكتبات', [
    'Library and Information Science',
    'Library Science',
  ]),
  rule(
    'media',
    '0211',
    'video production|film production|filmmaking|photography|video editing|animation|multimedia|التصوير|الرسوم المتحركة',
    ['Film and Television', 'Film Studies', 'Multimedia', 'Animation', 'Photography'],
  ),
  rule(
    'graphic-design',
    '0211',
    'graphic design|photoshop|illustrator|visual design|ui design|ux design|user experience design|التصميم الجرافيكي',
    ['Graphic Design', 'Visual Communication Design', 'Multimedia'],
  ),
  rule(
    'design',
    '0212',
    'interior design|fashion design|industrial design|التصميم الداخلي|تصميم الازياء',
    ['Interior Design', 'Fashion Design', 'Industrial Design'],
  ),
  rule('arts', '0213', 'fine arts|drawing|painting|sculpture|الفنون الجميلة|الرسم', [
    'Fine Arts',
    'Visual Arts',
  ]),
  rule('music', '0215', 'music|guitar|piano|performing arts|الموسيقى', [
    'Music',
    'Performing Arts',
  ]),
  rule('biology', '0511', 'biology|genetics|microbiology|ecology|علم الاحياء|الوراثة', [
    'Biology',
    'Biological Sciences',
    'Microbiology',
    'Genetics',
  ]),
  rule(
    'biochemistry',
    '0512',
    'biochemistry|biotechnology|molecular biology|الكيمياء الحيوية|التكنولوجيا الحيوية',
    ['Biochemistry', 'Biotechnology', 'Molecular Biology'],
  ),
  rule(
    'environment',
    '0521',
    'environmental science|environmental management|sustainability|climate change|carbon emissions|environmental sustainability|الاستدامة|تغير المناخ|علوم البيئة',
    [
      'Environmental Science',
      'Environmental Sciences',
      'Environmental Management',
      'Sustainability Management',
    ],
  ),
  rule(
    'wildlife',
    '0522',
    'wildlife|biodiversity|nature conservation|الحياة البرية|التنوع الحيوي',
    ['Ecology', 'Environmental Science', 'Wildlife Management'],
  ),
  rule('chemistry', '0531', 'chemistry|chemical science|الكيمياء', ['Chemistry']),
  rule(
    'earth',
    '0532',
    'geology|earth science|geophysics|meteorology|geography|الجيولوجيا|علوم الارض',
    ['Geology', 'Geophysics', 'Earth Sciences', 'Geography'],
  ),
  rule('physics', '0533', 'physics|quantum|astronomy|الفيزياء|الفلك', ['Physics', 'Astronomy']),
  rule(
    'mathematics',
    '0541',
    'mathematics|algebra|calculus|trigonometry|geometry|الرياضيات|الجبر|التفاضل',
    ['Mathematics', 'Applied Mathematics'],
  ),
  rule(
    'chemical-engineering',
    '0711',
    'chemical engineering|process engineering|الهندسة الكيميائية',
    ['Chemical Engineering'],
  ),
  rule(
    'energy',
    '0713',
    'electrical engineering|renewable energy|solar energy|power systems|الهندسة الكهربائية|الطاقة المتجددة',
    ['Electrical Engineering', 'Renewable Energy Engineering', 'Energy Engineering'],
  ),
  rule(
    'electronics',
    '0714',
    'electronics|robotics|automation engineering|control systems|embedded systems|mechatronics|الالكترونيات|الروبوتات|الميكاترونكس',
    [
      'Electronics Engineering',
      'Electrical Engineering',
      'Mechatronics Engineering',
      'Robotics Engineering',
    ],
  ),
  rule(
    'mechanical',
    '0715',
    'mechanical engineering|mechanics|metalworking|welding|الهندسة الميكانيكية|اللحام',
    ['Mechanical Engineering'],
  ),
  rule(
    'vehicles',
    '0716',
    'automotive engineering|aerospace engineering|aircraft maintenance|marine engineering|هندسة الطيران|هندسة السيارات',
    ['Automotive Engineering', 'Aerospace Engineering', 'Marine Engineering'],
  ),
  rule(
    'engineering-general',
    '071',
    'engineering|الهندسة',
    [],
    'software engineering|prompt engineering|data engineering|social engineering',
  ),
  rule(
    'food-processing',
    '0721',
    'food processing|food technology|food manufacturing|تكنولوجيا الاغذية|تصنيع الاغذية',
    ['Food Science', 'Food Technology', 'Food Science and Technology'],
  ),
  rule(
    'architecture',
    '0731',
    'architecture|urban planning|town planning|landscape architecture|الهندسة المعمارية|التخطيط العمراني',
    ['Architecture', 'Urban Planning', 'Landscape Architecture'],
    'cloud|azure|software|data|enterprise architecture|computer architecture',
  ),
  rule(
    'civil',
    '0732',
    'civil engineering|construction management|building construction|structural engineering|الهندسة المدنية|ادارة التشييد',
    ['Civil Engineering', 'Construction Management', 'Structural Engineering'],
  ),
  rule(
    'agriculture',
    '0811',
    'agriculture|agricultural|farming|livestock|crop production|food security|الزراعة|الامن الغذائي',
    ['Agriculture', 'Agricultural Science', 'Agronomy', 'Animal Science'],
  ),
  rule('horticulture', '0812', 'horticulture|gardening|البستنة', ['Horticulture']),
  rule('forestry', '0821', 'forestry|forest management|الغابات', ['Forestry']),
  rule('fisheries', '0831', 'fisheries|aquaculture|الاستزراع السمكي|مصايد الاسماك', [
    'Fisheries',
    'Aquaculture',
  ]),
  rule('veterinary', '0841', 'veterinary|animal health|الطب البيطري', [
    'Veterinary Medicine',
    'Veterinary Science',
  ]),
  rule('dentistry', '0911', 'dentistry|dental|oral health|طب الاسنان', [
    'Dentistry',
    'Dental Medicine',
  ]),
  rule(
    'medicine',
    '0912',
    'medicine|clinical|medical|patients?|medical diagnosis|dermatitis|cardiology|diabetes|oncology|الطب البشري|التشخيص الطبي|المرضى',
    ['Human Medicine', 'General Medicine'],
    'veterinary|animal health|traditional medicine|complementary medicine|herbal medicine',
  ),
  rule('nursing', '0913', 'nursing|midwifery|التمريض|القبالة', ['Nursing', 'Midwifery']),
  rule(
    'laboratory',
    '0914',
    'medical laboratory|clinical laboratory|radiology|diagnostic imaging|المختبرات الطبية|الاشعة',
    ['Medical Laboratory Sciences', 'Medical Laboratory Science', 'Radiology', 'Medical Imaging'],
  ),
  rule(
    'rehabilitation',
    '0915',
    'physiotherapy|physical therapy|occupational therapy|rehabilitation medicine|العلاج الطبيعي|العلاج الوظيفي',
    ['Physical Therapy', 'Physiotherapy', 'Occupational Therapy'],
  ),
  rule('pharmacy', '0916', 'pharmacy|pharmacology|pharmaceutical|الصيدلة|علم الادوية', [
    'Pharmacy',
    'Pharmacology',
    'Pharmaceutical Sciences',
  ]),
  rule(
    'public-health',
    '0919',
    'public health|epidemiology|global health|health policy|vaccination|immunization|الصحة العامة|الوبائيات',
    ['Public Health', 'Epidemiology', 'Global Health'],
  ),
  rule(
    'hospitality',
    '1013',
    'hospitality|hotel management|culinary|catering|cooking|الفندقة|الطهي',
    ['Hospitality Management', 'Hotel Management', 'Culinary Arts'],
  ),
  rule('tourism', '1015', 'tourism|tourist|travel management|السياحة', [
    'Tourism',
    'Tourism Management',
    'Tourism and Hospitality Management',
  ]),
  rule(
    'sports',
    '1014',
    'sports|sport science|physical education|fitness|التربية البدنية|اللياقة',
    ['Sports Science', 'Physical Education'],
  ),
  rule(
    'safety',
    '1022',
    'occupational health|occupational safety|workplace safety|السلامة المهنية|الصحة المهنية',
    ['Occupational Health and Safety'],
  ),
  rule(
    'transport',
    '1041',
    'logistics|supply chain|transportation|اللوجستيات|سلاسل الامداد|النقل',
    [
      'Logistics',
      'Supply Chain Management',
      'Logistics and Supply Chain Management',
      'Transportation Management',
    ],
  ),
  rule(
    'ai-tools',
    '0613',
    'ai inference|ai infrastructure|ai agents|ethical ai|ai search|large language models|llm|llms|chatgpt|gemini|prompt engineering|multi-agent systems|inteligência artificial|inteligencia artificial|intelligence artificielle|künstliche intelligenz',
    ['Artificial Intelligence', 'Data Science', 'Computer Science'],
  ),
  rule(
    'software-tools',
    '0613',
    'software testing|front-end development|front end development|back-end development|website|bootstrap|selenium|uipath|rpa|robotic process automation|mulesoft|workato|apex|desenvolvimento de software|programação|programacion',
    ['Computer Science', 'Software Engineering', 'Information Systems'],
  ),
  rule(
    'business-software',
    '0611',
    'salesforce platform|trailhead|dynamics 365|sap ariba|slack|digital skills|digital literacy|computer use|informatica|informática|herramientas digitales',
  ),
  rule(
    'data-platforms',
    '0612',
    'data warehousing|data management|customer data|data strategy|databricks|sap bw|business intelligence|power bi|tableau',
    ['Information Systems', 'Computer Information Systems', 'Data Science', 'Business Analytics'],
  ),
  rule(
    'cyber-operations',
    '0612',
    'siem|identity and access management|encryption|malware|phishing|vulnerability|security operations|network administration',
    [
      'Cybersecurity',
      'Information Security',
      'Computer Networks',
      'Network Administration',
      'Network Security',
    ],
  ),
  rule(
    'international-trade',
    '0416',
    'international trade|trade policy|export|import procedures|customs|comercio internacional|comércio internacional|التجارة الدولية',
    ['International Business', 'International Trade'],
  ),
  rule(
    'procurement',
    '0413',
    'procurement|sourcing|spend management|public procurement|purchasing|المشتريات',
    ['Supply Chain Management', 'Business Administration'],
  ),
  rule(
    'team-management',
    '0413',
    'team management|team leadership|people management|organisational|organizational|project teams|business strategy|strategic planning|gestão de projetos|gestão de pessoas',
    ['Business Administration', 'Management', 'Project Management'],
  ),
  rule('sales', '0416', 'sales|customer service|fundraising|vendas|atendimento ao cliente', [
    'Marketing',
    'Business Administration',
  ]),
  rule(
    'general-work-skills',
    '0031',
    'leadership|collaboration|professional development|productivity|career planning|job search|wellbeing|research skills|research integrity|scholarly publishing|manuscript preparation|research publishing|academic research|research methods|professional communication|desenvolvimento profissional|مهارات البحث',
  ),
  rule(
    'emergency-management',
    '1032',
    'emergency management|emergency planning|disaster|humanitarian action|humanitarian delivery|humanitarian assistance|cluster coordination|hazardous materials|nuclear security|ادارة الطوارئ',
    ['Disaster Management', 'Emergency Management'],
  ),
  rule(
    'beauty',
    '1012',
    'beauty|makeup|cosmetics|skin care|skincare|hairdressing|maquiagem|cabeleireiro|التجميل',
    ['Cosmetology', 'Beauty Therapy'],
  ),
  rule(
    'health-general',
    '091',
    'health|healthcare|primary care|infectious disease|infectious diseases|patients|maternal health|pre-eclampsia|eclampsia|neurology|health equity|sante publique|saúde|salud',
  ),
  rule(
    'mental-health',
    '0313',
    'mental health|anxiety|depression|trauma-informed care|saúde mental|الصحة النفسية',
    ['Psychology', 'Clinical Psychology', 'Counseling Psychology'],
  ),
  rule('nutrition', '0919', 'nutrition|nutrição|nutrición|dietetics|التغذية', [
    'Nutrition',
    'Human Nutrition',
    'Nutrition and Dietetics',
  ]),
  rule('food-safety', '0721', 'food safety|food production|gastronomy|gastronomia|سلامة الاغذية', [
    'Food Science',
    'Food Technology',
  ]),
  rule(
    'climate',
    '0521',
    'carbon footprint|ghg|climate policy|esg|nachhaltigkeit|sustentabilidade|sostenibilidad',
    ['Environmental Science', 'Environmental Management', 'Sustainability Management'],
  ),
  rule(
    'first-aid',
    '0919',
    'first aid|basic life support|cardiopulmonary resuscitation|الاسعافات الاولية',
    ['Nursing', 'Emergency Medical Services', 'Paramedic Science'],
  ),
  rule(
    'recreation-sports',
    '1014',
    'jiu-jitsu|martial arts|yoga|pilates|swimming|football|basketball|السباحة|كرة القدم',
    ['Physical Education'],
  ),
  rule(
    'english-literature',
    '0232',
    'american renaissance|american literature|english literature|british literature',
    ['English Language and Literature', 'Comparative Literature'],
  ),
  rule('course-code-computing', '061', 'cs[0-9]{2,3}|computer science|computer communications', [
    'Computer Science',
  ]),
  rule('course-code-business', '041', 'bus[0-9]{3}'),
  rule('course-code-english', '023', 'engl[0-9]{3}'),
  rule('course-code-math', '0541', 'math[0-9]{3}|ma[0-9]{3}|matemática|matematicas', [
    'Mathematics',
  ]),
  rule(
    'geospatial',
    '0532',
    'qgis|geographic information systems|geospatial|spatial analysis|gis|الجغرافيا المكانية',
    ['Geography', 'Geographic Information Systems', 'Geomatics'],
  ),
  rule(
    'software-quality',
    '0613',
    'studio testing|automation testing|unit testing|test cases|software quality|software support|api development|software integration',
    ['Computer Science', 'Software Engineering', 'Information Technology'],
  ),
  rule(
    'computer-support',
    '0612',
    'computer hardware|hardware support|network support|networks|it support|computer security|technical support',
    ['Information Technology', 'Computer Networks', 'Network Administration'],
  ),
  rule(
    'digital-tools',
    '0611',
    'computadores|dispositivos móveis|ferramentas digitais|computer skills|digital tools|office applications',
  ),
  rule(
    'crm-analytics',
    '0612',
    'crm analytics|customer analytics|data 360|data reporting|analytics dashboard|data visualization|dashboards',
    ['Information Systems', 'Business Analytics', 'Data Science'],
  ),
  rule(
    'research-practice',
    '0031',
    'journal selection|manuscript|publication strategy|publishing strategy|research design|research evaluation|research career|research policy|inclusive research|gender & research|academic writing',
  ),
  rule(
    'digital-commerce',
    '0416',
    'facebook marketplace|online shop|online store|amazon seller|mercado digital',
    ['E-Commerce', 'Marketing', 'Business Administration'],
  ),
  rule(
    'digital-finance',
    '0412',
    'bitcoin|cryptocurrency|blockchain finance|digital currency|العملات الرقمية',
    ['Financial Technology', 'Finance'],
  ),
  rule(
    'public-administration',
    '0413',
    'contratos públicos|contratação|contratacao|compras públicas|gestão pública|public administration|public sector management|public asset management',
    ['Public Administration', 'Business Administration'],
  ),
  rule(
    'civic-governance',
    '0312',
    'governança|governance|public regulation|regulação|السياسات العامة',
    ['Public Administration', 'Public Policy', 'Political Science'],
  ),
  rule(
    'social-inclusion',
    '0314',
    'social inclusion|gender equality|violence against women|migrant workers|human trafficking|social protection|migration studies|inclusão social',
    ['Sociology', 'Social Work', 'Gender Studies'],
  ),
  rule(
    'elder-care',
    '0921',
    'older people|elderly care|healthy aging|healthy ageing|age-friendly|gerontology|رعاية المسنين',
    ['Gerontology', 'Nursing', 'Social Work'],
  ),
  rule(
    'textiles',
    '0723',
    'fashion & textiles|textile|textiles|sewing|tailoring|confeccion|costura|النسيج|الخياطة',
  ),
  rule(
    'manufacturing',
    '072',
    'manufacturing|production engineering|industrial production|التصنيع',
  ),
  rule('illustration', '0213', 'digital illustration|krita|procreate|illustration drawing', [
    'Fine Arts',
    'Visual Arts',
    'Graphic Design',
  ]),
  rule(
    'economic-development',
    '0311',
    'economic empowerment|economic development|economic data|korean economy|التمكين الاقتصادي',
    ['Economics', 'Development Economics'],
  ),
  rule(
    'ict-general',
    '06',
    'information technology|computing|data & software|digital technology|تقنية المعلومات',
  ),
  rule(
    'portuguese-workplace',
    '1022',
    'segurança em máquinas|segurança do trabalho|segurança no trabalho|seguranca do trabalho|nr12|nr-12|nr 12|nr10|nr-10',
  ),
  rule(
    'portuguese-business',
    '0413',
    'administração|administracao|gestão de negócios|gestão empresarial|gestão de projetos|gestão de pessoas|gestão de conflitos',
    ['Business Administration'],
  ),
  rule(
    'portuguese-finance',
    '0412',
    'finanças|financas|educação financeira|investimentos|orçamento público',
    ['Finance'],
  ),
  rule(
    'portuguese-education',
    '011',
    'educação|educacao|escola|ensino|pedagogia|docência|docencia',
    ['Education', 'General Education'],
  ),
  rule('portuguese-law', '0421', 'direito|legislação|legislacao|direitos humanos', ['Law']),
  rule('portuguese-environment', '0521', 'meio ambiente|ambiental|gestão ambiental|sustentável', [
    'Environmental Science',
    'Environmental Management',
  ]),
  rule('portuguese-accounting', '0411', 'contabilidade|contábil|contabil|tributação|tributacao', [
    'Accounting',
  ]),
  rule(
    'automotive-practice',
    '0716',
    'automotive|automotive engine|vehicle maintenance|diesel engine|automotiva|mecânica automotiva',
    ['Automotive Engineering', 'Mechanical Engineering'],
  ),
  rule(
    'network-protocols',
    '0612',
    'dns|dhcp|firewalls|network troubleshooting|tcp/ip|wireless networks|routing|switching',
    ['Computer Networks', 'Network Administration', 'Network Security'],
  ),
  rule(
    'saas-configuration',
    '0611',
    'salesforce|omnistudio|flexcards|agentforce|google workspace|google docs|google slides|microsoft teams',
  ),
  rule(
    'transport-practice',
    '1041',
    'road safety|vehicle operations|public transport|land transport|transporte público|transport services',
    ['Transportation Management'],
  ),
  rule(
    'constitutional-policy',
    '0312',
    'constitution|presidency|executive power|administrative state|democracy|constituição',
    ['Political Science', 'Public Administration'],
  ),
  rule(
    'vocational-teaching',
    '0113',
    'competency assessment|tvet|trainers methodology|vocational education|teacher training',
    ['Technical and Vocational Education', 'Education', 'General Education'],
  ),
  rule(
    'freelance-career',
    '0031',
    'freelancing|freelancer|interview skills|interview fundamentals|job interview|career readiness',
  ),
  rule(
    'industrial-digital',
    '071',
    'digital twin|industry 4.0|industrial digitalization|industrial simulation',
  ),
  rule(
    'clinical-specialties',
    '0912',
    'gastroenterology|prescription therapy|obstetrics|nephrology|rheumatology|infectious diseases|multiple sclerosis|ibs-c|hiv|tuberculosis|hypertension|breast cancer|cardiovascular|psoriasis|atopic dermatitis|الامراض المعدية',
    ['Human Medicine'],
  ),
  rule(
    'supply-operations',
    '1041',
    'humanitarian operations|distribution practice|warehouse operations|warehousing|procurement logistics',
    ['Supply Chain Management', 'Logistics'],
  ),
  rule(
    'neurodevelopment',
    '0313',
    'autism|neurodiversity|autism spectrum|neurodevelopment|التوحد',
    ['Psychology', 'Special Education'],
  ),
  rule(
    'financial-integrity',
    '0411',
    'anti-corruption|financial investigations|anti-money laundering|fraud prevention|fraud detection|financial crime',
    ['Accounting', 'Finance'],
  ),
  rule(
    'testing-practice',
    '0613',
    'test manager|test execution|test automation|test sets|unit tests|integration tests',
    ['Software Engineering', 'Computer Science'],
  ),
  rule(
    'music-languages',
    '0215',
    'salsa caribeña|música|musica|violão|violao|guitarra|canto coral',
    ['Music', 'Performing Arts'],
  ),
  rule(
    'technical-drawing',
    '073',
    'technical drawing|cad design|autocad|revit|building information modeling|desenho técnico',
  ),
];

export const normalizeAcademicText = (value) =>
  String(value ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\u064b-\u065f\u0670\u0640]/gu, '')
    .replace(/[أإآ]/gu, 'ا')
    .replace(/ى/gu, 'ي')
    .replace(/[\u2010-\u2015\u2212]/gu, '-')
    .replace(/\s+/gu, ' ')
    .trim();
export const normalizeMajorName = (value) =>
  normalizeAcademicText(value)
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
const compile = (source) => new RegExp(`(?<![\\p{L}\\p{N}])(?:${source})(?![\\p{L}\\p{N}])`, 'iu');
const compiled = COURSE_ACADEMIC_RULES.map((item) => ({
  ...item,
  match: compile(item.pattern),
  omit: item.exclude ? compile(item.exclude) : null,
}));

export function classifyCourseAcademicSubjects(course) {
  const title = course.originalSourceTitle || course.canonicalName || course.displayName || '';
  const segments = [
    ...new Set(
      String(course.shortCourseTopicsRaw ?? '')
        .split(/[•|;\n]/u)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
  const evidence = [
    ...segments.map((text) => ({ field: 'shortCourseTopicsRaw', text })),
    { field: 'originalSourceTitle', text: title },
  ];
  const context = normalizeAcademicText(title + ' ' + segments.join(' '));
  return compiled.flatMap((item) => {
    if (item.omit?.test(context)) return [];
    const hit = evidence.find((value) => item.match.test(normalizeAcademicText(value.text)));
    return hit
      ? [{ ruleId: item.id, code: item.code, majorNames: item.majors, evidence: hit }]
      : [];
  });
}

/** Exact reference names supplement curated skill rules. Ambiguous aliases and
 * broad major labels never fan out into unrelated major families. */
export function buildAcademicSubjectIndex(snapshot) {
  const nodes = snapshot.nodes.filter(
    (node) => node.status === 'ACTIVE' && node.standardType === 'ISCED',
  );
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const names = new Map(),
    majorNames = new Map();
  const add = (map, name, item) => {
    const key = normalizeMajorName(name);
    if (key.length < 5 || !/\p{L}/u.test(key)) return;
    if (!map.has(key)) map.set(key, []);
    if (!map.get(key).some((value) => value.id === item.id)) map.get(key).push(item);
  };
  for (const node of nodes)
    for (const name of [
      node.canonicalName,
      ...Object.values(node.localizedNames ?? {}),
      ...(node.aliases ?? []).map((alias) => alias.alias),
    ])
      add(names, name, node);
  for (const major of snapshot.majors) {
    if (
      ['ARCHIVED', 'REJECTED'].includes(major.status) ||
      (major.levelProfiles?.length &&
        major.levelProfiles.every((profile) => profile.level === 'FELLOWSHIP'))
    )
      continue;
    for (const name of [
      major.canonicalName,
      major.localizedNameAr,
      major.localizedNameEn,
      ...(major.aliases ?? []).map((alias) => alias.alias),
    ])
      add(majorNames, name, major);
  }
  const generic = new Set([
    'technology',
    'systems',
    'science',
    'design',
    'business',
    'management',
    'administration',
    'engineering',
    'health',
    'education',
    'languages',
    'research',
    'communication',
    'software',
    'computing',
  ]);
  return (course) => {
    const hits = classifyCourseAcademicSubjects(course);
    const segments = String(course.shortCourseTopicsRaw ?? '')
      .split(/[•|;\n]/u)
      .map((text) => text.trim())
      .filter(Boolean);
    for (const text of segments) {
      const key = normalizeMajorName(text);
      if (['technology', 'systems', 'science', 'design'].includes(key)) continue;
      const candidates = [...(names.get(key) ?? [])].sort(
        (a, b) => b.canonicalCode.length - a.canonicalCode.length,
      );
      if (
        candidates.length &&
        candidates.every((node) => candidates[0].canonicalCode.startsWith(node.canonicalCode))
      )
        hits.push({
          ruleId: 'literal-taxonomy',
          code: candidates[0].canonicalCode,
          majorNames: [],
          evidence: { field: 'shortCourseTopicsRaw', text },
        });
      if (generic.has(key)) continue;
      const majors = majorNames.get(key) ?? [];
      if (new Set(majors.map((major) => normalizeMajorName(major.canonicalName))).size !== 1)
        continue;
      for (const major of majors) {
        if (
          hits.some((hit) =>
            hit.majorNames.some(
              (name) => normalizeMajorName(name) === normalizeMajorName(major.canonicalName),
            ),
          )
        )
          continue;
        const node = nodeById.get(major.disciplineId) ?? nodeById.get(major.academicFieldId);
        if (node)
          hits.push({
            ruleId: 'literal-major',
            code: node.canonicalCode,
            majorNames: [major.canonicalName],
            evidence: { field: 'shortCourseTopicsRaw', text },
          });
      }
    }
    return hits;
  };
}
