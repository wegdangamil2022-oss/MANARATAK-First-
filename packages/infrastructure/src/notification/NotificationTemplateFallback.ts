import type { NotificationContents } from '@absheer/domain';
/** Compatibility content, captured once into the intent; never defer rendering to a mutable provider template. */
export function notificationTemplateFallback(
  templateId: string,
  variables: Readonly<Record<string, string>>,
): NotificationContents {
  if (templateId === 'student-application-deadline-v1')
    return {
      ar: { subject: 'تذكير بموعد المنحة', body: 'اقترب موعد تقديم المنحة: {{deadlineAt}}' },
      en: {
        subject: 'Scholarship deadline reminder',
        body: 'Scholarship application deadline approaching: {{deadlineAt}}',
      },
    };
  if (!templateId.startsWith('system.') && variables.title && variables.message)
    return {
      ar: { subject: '{{title}}', body: '{{message}}' },
      en: { subject: '{{title}}', body: '{{message}}' },
    }; // Historical single-language operator text is preserved; new authoring requires explicit AR/EN contents.
  return {
    ar: { subject: 'تحديث في حساب أبشر', body: 'يوجد تحديث في حسابك. راجع التفاصيل من حسابك.' },
    en: {
      subject: 'ABSHEER account update',
      body: 'There is an update in your account. Open your account to view the details.',
    },
  };
}
