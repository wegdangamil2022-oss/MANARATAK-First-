import { useId, useState } from 'react';
import type { DashboardPoint } from '@manaratak/shared';

/** Small, dependency-free SVG: nulls are gaps, never fabricated zeroes. */
export function ExecutiveChart({
  title,
  points,
  language,
  firstLabel,
  secondLabel,
  empty,
  caption,
}: {
  title: string;
  points: DashboardPoint[];
  language: string;
  firstLabel: string;
  secondLabel?: string;
  empty: string;
  caption: string;
}) {
  const id = useId(),
    [focus, setFocus] = useState<number | null>(null);
  const n = (value: number | null | undefined) =>
    value == null ? '—' : new Intl.NumberFormat(language).format(value);
  const date = (value: string) =>
    new Intl.DateTimeFormat(language, { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(
      new Date(value + 'T12:00:00Z'),
    );
  const width = 560,
    height = 170,
    left = 24,
    top = 10,
    bottom = 24;
  const maximum = Math.max(
    1,
    ...points.flatMap((point) => [
      point.value ?? 0,
      ...(secondLabel ? [point.secondary ?? 0] : []),
    ]),
  );
  const x = (index: number) => left + (index * (width - left * 2)) / Math.max(1, points.length - 1);
  const y = (value: number) => top + (1 - value / maximum) * (height - top - bottom);
  const path = (field: 'value' | 'secondary') => {
    let continuing = false;
    return points
      .map((point, index) => {
        const value = point[field];
        if (value == null) {
          continuing = false;
          return '';
        }
        const command = continuing ? 'L' : 'M';
        continuing = true;
        return `${command}${x(index).toFixed(2)},${y(value).toFixed(2)}`;
      })
      .join(' ');
  };
  const selected = focus === null ? null : points[Math.min(focus, points.length - 1)];
  const measured = points.some((point) => point.value !== null);
  return (
    <figure className="executive-chart" aria-labelledby={id}>
      <figcaption id={id}>
        <h3>{title}</h3>
        <span className="executive-chart-legend">
          <i />
          {firstLabel}
          {secondLabel && (
            <>
              <i className="secondary" />
              {secondLabel}
            </>
          )}
        </span>
      </figcaption>
      {measured ? (
        <>
          <div className="executive-chart-plot">
            <div className="executive-chart-scale" aria-hidden="true">
              <span>{n(maximum)}</span>
              <span>{n(Math.round(maximum / 2))}</span>
              <span>{n(0)}</span>
            </div>
            <svg
              data-chart="true"
              viewBox={`0 0 ${width} ${height}`}
              role="img"
              tabIndex={0}
              aria-labelledby={id}
              aria-describedby={id + '-summary'}
              onMouseMove={(event) => {
                const bounds = event.currentTarget.getBoundingClientRect();
                setFocus(
                  Math.max(
                    0,
                    Math.min(
                      points.length - 1,
                      Math.round(
                        ((((event.clientX - bounds.left) / bounds.width) * width - left) /
                          (width - left * 2)) *
                          (points.length - 1),
                      ),
                    ),
                  ),
                );
              }}
              onMouseLeave={() => setFocus(null)}
              onFocus={() => setFocus(points.length - 1)}
              onKeyDown={(event) => {
                if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
                  event.preventDefault();
                  setFocus((index) =>
                    event.key === 'Home'
                      ? 0
                      : event.key === 'End'
                        ? points.length - 1
                        : Math.max(
                            0,
                            Math.min(
                              points.length - 1,
                              (index ?? 0) + (event.key === 'ArrowRight' ? 1 : -1),
                            ),
                          ),
                  );
                }
              }}
            >
              {[0, 0.5, 1].map((value) => (
                <line
                  key={value}
                  x1={left}
                  x2={width - left}
                  y1={y(value * maximum)}
                  y2={y(value * maximum)}
                  stroke="#DDEFF2"
                />
              ))}
              <path d={path('value')} fill="none" stroke="#0E7C86" strokeWidth="2.5" />
              {secondLabel && (
                <path
                  d={path('secondary')}
                  fill="none"
                  stroke="#142B5F"
                  strokeWidth="2"
                  strokeDasharray="5 3"
                />
              )}
              {selected && focus !== null && (
                <line
                  x1={x(focus)}
                  x2={x(focus)}
                  y1={top}
                  y2={height - bottom}
                  stroke="#D6A43B"
                  strokeWidth="1.5"
                />
              )}
            </svg>
          </div>
          <div className="executive-chart-axis" dir="ltr">
            <span>{date(points[0].date)}</span>
            <span>{date(points[points.length - 1].date)}</span>
          </div>
          <p className="executive-chart-tooltip" role="status" aria-live="polite">
            {selected
              ? `${date(selected.date)} · ${firstLabel}: ${n(selected.value)}${secondLabel ? ` · ${secondLabel}: ${n(selected.secondary)}` : ''}`
              : language === 'ar'
                ? 'حرّك المؤشر أو استخدم الأسهم على الرسم لعرض القيم.'
                : 'Hover or use arrow keys on the chart to inspect values.'}
          </p>
        </>
      ) : (
        <p className="executive-empty">{empty}</p>
      )}
      <p id={id + '-summary'} className="executive-caption">
        {caption}
      </p>
      <table className="executive-sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th>{language === 'ar' ? 'التاريخ — UTC' : 'Date — UTC'}</th>
            <th>{firstLabel}</th>
            {secondLabel && <th>{secondLabel}</th>}
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.date}>
              <td>{point.date}</td>
              <td>{n(point.value)}</td>
              {secondLabel && <td>{n(point.secondary)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
