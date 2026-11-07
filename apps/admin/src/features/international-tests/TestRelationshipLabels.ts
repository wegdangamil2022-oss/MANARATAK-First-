const labels: Record<string, readonly [string, string]> = {
  SOURCE_JURISDICTION: ['الدولة المرتبطة بالاختبار في المصدر', 'Source jurisdiction'],
  TESTED_LANGUAGE: ['اللغة التي يقيسها الاختبار', 'Tested language'],
  QUESTION_LANGUAGE: ['لغة أسئلة الاختبار', 'Question language'],
  ADMISSION_TARGET: ['الدرجة المستهدفة بالقبول', 'Admission target degree'],
  EXPLICIT_ADMISSION_FIELD: ['المجال الأكاديمي المذكور في المصدر', 'Explicit academic field'],
};

export function testRelationshipLabel(type: string, isRtl: boolean): string {
  return labels[type]?.[isRtl ? 0 : 1] ?? type;
}
