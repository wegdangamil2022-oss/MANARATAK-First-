import type { PublicArticle } from './types';
type ArticleContentType = PublicArticle['contentType'];
export interface ArticlePreview {
  author?: string;
  id: string;
  slug: string;
  titleAr: string;
  titleEn: string;
  excerptAr: string;
  excerptEn: string;
  contentType: ArticleContentType;
  contentTypeLabelAr: string;
  contentTypeLabelEn: string;
  categoryAr: string;
  categoryEn: string;
  countryAr: string;
  countryEn: string;
  readingTime: string;
  readingTimeEn?: string;
  updatedAt: string;
  updatedAtEn?: string;
  coverImage: string;
  featured: boolean;
}
