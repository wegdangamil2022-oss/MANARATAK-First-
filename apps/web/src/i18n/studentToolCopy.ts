import { ar } from './ar';
import { en } from './en';
export function studentToolCopy(key: keyof typeof en, locale: 'ar' | 'en') {
  return (locale === 'ar' ? ar : en)[key];
}
