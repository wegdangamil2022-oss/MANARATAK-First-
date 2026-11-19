export type ChannelCategoryFilter =
  | 'all'
  | 'whatsapp-channels'
  | 'telegram-channels'
  | 'telegram-groups'
  | 'whatsapp-groups';

export type ChannelDesignVariant = 'majors-table' | 'majors-kv-grid' | 'academic-index';

export type ChannelAvatarCode =
  | 'official'
  | 'postgrad'
  | 'cn'
  | 'eu'
  | 'tr'
  | 'ru'
  | 'sa'
  | 'iq'
  | 'id'
  | 'ye';

export interface CommunityChannelItem {
  id: string;
  category: Exclude<ChannelCategoryFilter, 'all'>;
  platform: 'whatsapp' | 'telegram';
  kind: 'channel' | 'group';
  title: string;
  scopeLabel: string;
  platformLabel: string;
  avatarCode: ChannelAvatarCode;
  url: string;
}

export interface ChannelCategorySection {
  id: Exclude<ChannelCategoryFilter, 'all'>;
  orderLabel: string;
  title: string;
  shortTitle: string;
  badge: string;
  platform: 'whatsapp' | 'telegram';
  kind: 'channel' | 'group';
}

export const CHANNEL_DESIGN_VARIANTS: Array<{
  id: ChannelDesignVariant;
  num: string;
  label: string;
  subtitle: string;
}> = [
  {
    id: 'majors-table',
    num: '١',
    label: '١. جدول التخصصات',
    subtitle: 'جدول رسمي من ٣ أعمدة مطابق لهوية جداول التخصصات',
  },
  {
    id: 'majors-kv-grid',
    num: '٢',
    label: '٢. جدول البنود',
    subtitle: 'جدول مقسّم (المسار + القناة) مطابق لجدول معلومات التخصص',
  },
  {
    id: 'academic-index',
    num: '٣',
    label: '٣. الفهرس المرقّم',
    subtitle: 'صفوف فهرسية مرقّمة بأيقونات نيلي وذهبي هادئة',
  },
];

export const COMMUNITY_CHANNELS: CommunityChannelItem[] = [
  // أولاً: قنوات المنح الدراسية – واتساب (3)
  {
    id: 'wa-ch-official',
    category: 'whatsapp-channels',
    platform: 'whatsapp',
    kind: 'channel',
    title: 'القناة الرسمية للمنح الدراسية',
    scopeLabel: 'المنح العامة الشاملة',
    platformLabel: 'قناة واتساب رسمية',
    avatarCode: 'official',
    url: 'https://whatsapp.com/channel/0029VaGWhVm7DAWsfEJacd2m',
  },
  {
    id: 'wa-ch-china',
    category: 'whatsapp-channels',
    platform: 'whatsapp',
    kind: 'channel',
    title: 'القناة الرسمية للمنح الدراسية في الصين',
    scopeLabel: 'منح الجامعات الصينية',
    platformLabel: 'قناة واتساب رسمية',
    avatarCode: 'cn',
    url: 'https://whatsapp.com/channel/0029Vb6q3JE2v1InIv8ow63M',
  },
  {
    id: 'wa-ch-europe',
    category: 'whatsapp-channels',
    platform: 'whatsapp',
    kind: 'channel',
    title: 'قناة المنح الدراسية في أوروبا',
    scopeLabel: 'منح الدول الأوروبية',
    platformLabel: 'قناة واتساب رسمية',
    avatarCode: 'eu',
    url: 'https://whatsapp.com/channel/0029VbCLqxFI1rcjndPJ021t',
  },

  // ثانياً: قنوات المنح الدراسية – تليجرام (6)
  {
    id: 'tg-ch-official',
    category: 'telegram-channels',
    platform: 'telegram',
    kind: 'channel',
    title: 'القناة الرسمية للمنح الدراسية',
    scopeLabel: 'المنح العامة الشاملة',
    platformLabel: 'قناة تليجرام رسمية',
    avatarCode: 'official',
    url: 'https://t.me/UUOOOOOOUU',
  },
  {
    id: 'tg-ch-china',
    category: 'telegram-channels',
    platform: 'telegram',
    kind: 'channel',
    title: 'القناة الرسمية للمنح الدراسية في الصين',
    scopeLabel: 'منح الجامعات الصينية',
    platformLabel: 'قناة تليجرام رسمية',
    avatarCode: 'cn',
    url: 'https://t.me/StudyinChiiina2026',
  },
  {
    id: 'tg-ch-china-bachelor',
    category: 'telegram-channels',
    platform: 'telegram',
    kind: 'channel',
    title: 'قناة منح البكالوريوس في الصين',
    scopeLabel: 'مرحلة البكالوريوس',
    platformLabel: 'قناة تليجرام رسمية',
    avatarCode: 'cn',
    url: 'https://t.me/chineseuniversitiess',
  },
  {
    id: 'tg-ch-europe',
    category: 'telegram-channels',
    platform: 'telegram',
    kind: 'channel',
    title: 'قناة المنح الدراسية في أوروبا',
    scopeLabel: 'منح الدول الأوروبية',
    platformLabel: 'قناة تليجرام رسمية',
    avatarCode: 'eu',
    url: 'https://t.me/UUOOOOOOUO',
  },
  {
    id: 'tg-ch-postgrad',
    category: 'telegram-channels',
    platform: 'telegram',
    kind: 'channel',
    title: 'قناة المنح الدراسية للدراسات العليا',
    scopeLabel: 'ماجستير ودكتوراه',
    platformLabel: 'قناة تليجرام رسمية',
    avatarCode: 'postgrad',
    url: 'https://t.me/UU22UUU2',
  },
  {
    id: 'tg-ch-csca',
    category: 'telegram-channels',
    platform: 'telegram',
    kind: 'channel',
    title: 'قناة اختبار CSCA للقبول بالجامعات الصينية',
    scopeLabel: 'اختبار القبول CSCA',
    platformLabel: 'قناة تليجرام رسمية',
    avatarCode: 'cn',
    url: 'https://t.me/cscaexami',
  },

  // ثالثاً: قروبات مناقشة المنح الدراسية – تليجرام (8)
  {
    id: 'tg-grp-china',
    category: 'telegram-groups',
    platform: 'telegram',
    kind: 'group',
    title: 'قروب مناقشة المنح الدراسية في الصين',
    scopeLabel: 'نقاش منح الصين',
    platformLabel: 'مجموعة تليجرام',
    avatarCode: 'cn',
    url: 'https://t.me/studychina26',
  },
  {
    id: 'tg-grp-europe',
    category: 'telegram-groups',
    platform: 'telegram',
    kind: 'group',
    title: 'قروب مناقشة المنح الدراسية في أوروبا',
    scopeLabel: 'نقاش منح أوروبا',
    platformLabel: 'مجموعة تليجرام',
    avatarCode: 'eu',
    url: 'https://t.me/StudyinEurope3',
  },
  {
    id: 'tg-grp-turkey',
    category: 'telegram-groups',
    platform: 'telegram',
    kind: 'group',
    title: 'قروب مناقشة المنح الدراسية في تركيا',
    scopeLabel: 'نقاش منح تركيا',
    platformLabel: 'مجموعة تليجرام',
    avatarCode: 'tr',
    url: 'https://t.me/Ul_Ul_lU',
  },
  {
    id: 'tg-grp-russia',
    category: 'telegram-groups',
    platform: 'telegram',
    kind: 'group',
    title: 'قروب مناقشة المنح الدراسية في روسيا',
    scopeLabel: 'نقاش منح روسيا',
    platformLabel: 'مجموعة تليجرام',
    avatarCode: 'ru',
    url: 'https://t.me/UU2UUUU2',
  },
  {
    id: 'tg-grp-saudi',
    category: 'telegram-groups',
    platform: 'telegram',
    kind: 'group',
    title: 'قروب مناقشة المنح الدراسية في السعودية',
    scopeLabel: 'نقاش منح السعودية',
    platformLabel: 'مجموعة تليجرام',
    avatarCode: 'sa',
    url: 'https://t.me/StudyinSaudiArabia2',
  },
  {
    id: 'tg-grp-iraq',
    category: 'telegram-groups',
    platform: 'telegram',
    kind: 'group',
    title: 'قروب مناقشة المنح الدراسية في العراق',
    scopeLabel: 'نقاش منح العراق',
    platformLabel: 'مجموعة تليجرام',
    avatarCode: 'iq',
    url: 'https://t.me/StudyinIraq2026',
  },
  {
    id: 'tg-grp-indonesia',
    category: 'telegram-groups',
    platform: 'telegram',
    kind: 'group',
    title: 'قروب مناقشة المنح الدراسية في إندونيسيا',
    scopeLabel: 'نقاش منح إندونيسيا',
    platformLabel: 'مجموعة تليجرام',
    avatarCode: 'id',
    url: 'https://t.me/studyinindonesia2',
  },
  {
    id: 'tg-grp-yemen',
    category: 'telegram-groups',
    platform: 'telegram',
    kind: 'group',
    title: 'قروب مناقشة منح التبادل الثقافي في اليمن',
    scopeLabel: 'منح التبادل الثقافي',
    platformLabel: 'مجموعة تليجرام',
    avatarCode: 'ye',
    url: 'https://t.me/UUU202UUU',
  },

  // رابعاً: قروبات مناقشة المنح الدراسية – واتساب (5)
  {
    id: 'wa-grp-china',
    category: 'whatsapp-groups',
    platform: 'whatsapp',
    kind: 'group',
    title: 'قروب مناقشة المنح الدراسية في الصين',
    scopeLabel: 'نقاش منح الصين',
    platformLabel: 'مجموعة واتساب',
    avatarCode: 'cn',
    url: 'https://chat.whatsapp.com/JwaVKH7Wn787HeD0nQC8rC',
  },
  {
    id: 'wa-grp-turkey',
    category: 'whatsapp-groups',
    platform: 'whatsapp',
    kind: 'group',
    title: 'قروب مناقشة المنح الدراسية في تركيا',
    scopeLabel: 'نقاش منح تركيا',
    platformLabel: 'مجموعة واتساب',
    avatarCode: 'tr',
    url: 'https://chat.whatsapp.com/DKegN0GqZJl4FhfdALBXME',
  },
  {
    id: 'wa-grp-russia',
    category: 'whatsapp-groups',
    platform: 'whatsapp',
    kind: 'group',
    title: 'قروب مناقشة المنح الدراسية في روسيا',
    scopeLabel: 'نقاش منح روسيا',
    platformLabel: 'مجموعة واتساب',
    avatarCode: 'ru',
    url: 'https://chat.whatsapp.com/DyBi0MBVkX95kga3LPCy2b',
  },
  {
    id: 'wa-grp-yemen',
    category: 'whatsapp-groups',
    platform: 'whatsapp',
    kind: 'group',
    title: 'قروب مناقشة منح التبادل الثقافي في اليمن',
    scopeLabel: 'منح التبادل الثقافي',
    platformLabel: 'مجموعة واتساب',
    avatarCode: 'ye',
    url: 'https://chat.whatsapp.com/CcpkW8SrhjJEdWiSPtOcXk',
  },
  {
    id: 'wa-grp-iraq',
    category: 'whatsapp-groups',
    platform: 'whatsapp',
    kind: 'group',
    title: 'قروب مناقشة المنح الدراسية في العراق',
    scopeLabel: 'نقاش منح العراق',
    platformLabel: 'مجموعة واتساب',
    avatarCode: 'iq',
    url: 'https://chat.whatsapp.com/JvHhhfi9OkfA1OhnhEQUq9',
  },
];

export const CATEGORY_SECTIONS: ChannelCategorySection[] = [
  {
    id: 'whatsapp-channels',
    orderLabel: 'أولاً',
    title: 'قنوات المنح الدراسية – واتساب',
    shortTitle: 'قنوات واتساب',
    badge: '3 قنوات',
    platform: 'whatsapp',
    kind: 'channel',
  },
  {
    id: 'telegram-channels',
    orderLabel: 'ثانياً',
    title: 'قنوات المنح الدراسية – تليجرام',
    shortTitle: 'قنوات تليجرام',
    badge: '6 قنوات',
    platform: 'telegram',
    kind: 'channel',
  },
  {
    id: 'telegram-groups',
    orderLabel: 'ثالثاً',
    title: 'قروبات مناقشة المنح الدراسية – تليجرام',
    shortTitle: 'قروبات تليجرام',
    badge: '8 قروبات',
    platform: 'telegram',
    kind: 'group',
  },
  {
    id: 'whatsapp-groups',
    orderLabel: 'رابعاً',
    title: 'قروبات مناقشة المنح الدراسية – واتساب',
    shortTitle: 'قروبات واتساب',
    badge: '5 قروبات',
    platform: 'whatsapp',
    kind: 'group',
  },
];

const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

export function formatArabicOrderNumber(indexOneBased: number): string {
  const padded = String(indexOneBased).padStart(2, '0');
  return padded
    .split('')
    .map((ch) => ARABIC_DIGITS[Number(ch)] ?? ch)
    .join('');
}

export function filterCommunityChannels(
  filter: ChannelCategoryFilter,
  items: CommunityChannelItem[] = COMMUNITY_CHANNELS,
): CommunityChannelItem[] {
  if (filter === 'all') return items;
  return items.filter((item) => item.category === filter);
}

export function getGroupedCommunityChannels(
  filter: ChannelCategoryFilter,
  items: CommunityChannelItem[] = COMMUNITY_CHANNELS,
): Array<{ section: ChannelCategorySection; items: CommunityChannelItem[] }> {
  const activeSections =
    filter === 'all'
      ? CATEGORY_SECTIONS
      : CATEGORY_SECTIONS.filter((sec) => sec.id === filter);

  return activeSections
    .map((section) => ({
      section,
      items: items.filter((item) => item.category === section.id),
    }))
    .filter((group) => group.items.length > 0);
}
