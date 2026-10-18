import { useState } from 'react';
import type { PublicScholarshipDto } from '../../../api/client';

export function FundedProgramPairs({ pairs, language }: { pairs: NonNullable<PublicScholarshipDto['fundedProgramPairs']>; language: 'ar' | 'en' }) {
  const [selected, setSelected] = useState('');
  const degrees = [...new Map(pairs.map(pair => [pair.degreeLevelId, pair.degreeLabel || pair.degreeLevelId])).entries()];
  const current = degrees.some(([id]) => id === selected) ? selected : degrees[0]?.[0];
  const visible = pairs.filter(pair => pair.degreeLevelId === current);
  const label = language === 'ar' ? 'الدرجة الممولة' : 'Funded degree';
  if (!pairs.length) return <p>{language === 'ar' ? 'لم يُحدد اقتران موثق بين الدرجة والتخصص.' : 'No evidenced degree and major pair specified.'}</p>;
  return <div className="space-y-2">
    <label className="block">{label}<select aria-label={label} value={current} onChange={event => setSelected(event.target.value)} className="mx-2 rounded border p-1">{degrees.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
    <ul>{visible.map(pair => <li key={pair.linkKey}>{pair.majorLabel || pair.majorId} — {pair.programName}</li>)}</ul>
  </div>;
}
