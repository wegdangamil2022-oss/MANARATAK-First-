import React from 'react';
import { ExamDetails } from '@manaratak/ui';
import type { Exam } from '../types';
import { RelatedArticlesStrip } from './RelatedArticlesStrip';
import { FavoriteButton } from './FavoriteButton';
import { useDetailSearchTarget } from './DetailUi';

interface ExamDetailModalProps {
  exam: Exam;
  onClose: () => void;
  onOpenUniversity?: (id: string) => void;
  onOpenScholarship?: (id: string) => void;
  onOpenCountry?: (id: string) => void;
  onOpenArticle?: (id: string) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
  searchAnchor?: string;
  searchTerm?: string;
}

export const ExamDetailModal: React.FC<ExamDetailModalProps> = (props) => {
  useDetailSearchTarget(props.searchAnchor, props.searchTerm);
  return <ExamDetails {...props}
    favoriteControl={props.onToggleFavorite && <FavoriteButton active={props.isFavorite ?? false}
      onToggle={(event) => { event.stopPropagation(); props.onToggleFavorite?.(props.exam.id); }}
      className="bg-[var(--mn-surface)]/95 mn-panel" />}
    relatedArticles={<RelatedArticlesStrip articles={props.exam.relatedArticles} onOpenArticle={props.onOpenArticle} compact />}
  />;
};
