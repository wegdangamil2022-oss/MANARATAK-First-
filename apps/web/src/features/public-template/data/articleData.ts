import type { PublicArticle } from '../types';
export interface ArticlePreviewRecord {
  id: string;
  titleAr: string;
  titleEn: string;
  contentType: PublicArticle['contentType'];
  contentTypeLabelAr: string;
  categoryAr: string;
  author: string;
  updatedAt: string;
  excerptAr?: string;
  linkedEntities?: PublicArticle['linkedEntities'];
}


export const ARTICLE_PREVIEWS: ArticlePreviewRecord[] = [];
export const GOLDEN_ARTICLES: PublicArticle[] = [];
