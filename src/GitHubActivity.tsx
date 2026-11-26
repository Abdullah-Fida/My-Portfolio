import { useEffect, useMemo, useRef, useState } from 'react';
import { Github } from './BrandIcons';
import { profile } from './content';
import snapshot from './data/github-activity.json';

type Day = { date: string; count: number; level: number };
type Activity = { total: number; contributions: Day[]; fetchedAt: string };
const endpoint = 'https://github-contributions-api.jogruber.de/v4/Abdullah-Fida?y=last';
const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
function dateLabel(date: string) { return dateFormat.format(new Date(`${date}T00:00:00Z`)); }
function validate(value: unknown): value is { total: { lastYear: number }; contributions: Day[] } {
  if (!value || typeof value !== 'object') return false;
  const data = value as { total?: { lastYear?: number }; contributions?: Day[] };
  return Number.isInteger(data.total?.lastYear) && Number(data.total?.lastYear) >= 0 && Array.isArray(data.contributions) && data.contributions.length >= 300 && data.contributions.length <= 380 && data.contributions.every(day => /^\d{4}-\d{2}-\d{2}$/.test(day.date) && Number.isInteger(day.count) && day.count >= 0 && Number.isInteger(day.level) && day.level >= 0 && day.level <= 4);
}

export default function GitHubActivity() {
  const [activity, setActivity] = useState<Activity>(snapshot);
  const [sourceState, setSourceState] = useState<'snapshot' | 'synced' | 'unavailable'>('snapshot');
  const [hovered, setHovered] = useState<Day | null>(null);
  const section = useRef<HTMLElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let started = false;
    async function refresh() {
      if (started) return;
      started = true;
      timeout = setTimeout(() => controller.abort(), 12000);
      try {
        const response = await fetch(endpoint, { signal: controller.signal });
        if (!response.ok) throw new Error('Activity source unavailable');
        const data: unknown = await response.json();
        if (!validate(data)) throw new Error('Invalid activity data');
        const age = Math.max(0, Number(response.headers.get('age')) || 0);
        setActivity({ total: data.total.lastYear, contributions: data.contributions, fetchedAt: new Date(Date.now() - age * 1000).toISOString() });
        setSourceState('synced');
      } catch { if (!controller.signal.aborted) setSourceState('unavailable'); }
      finally { if (timeout) clearTimeout(timeout); }
    }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { void refresh(); observer.disconnect(); }
    }, { rootMargin: '250px' });
    if (section.current) observer.observe(section.current);
    return () => { observer.disconnect(); controller.abort(); if (timeout) clearTimeout(timeout); };
  }, []);

  const calendar = useMemo(() => {
    const days = [...activity.contributions].sort((a, b) => a.date.localeCompare(b.date));
    const offset = new Date(`${days[0].date}T00:00:00Z`).getUTCDay();
    const weeks = Math.ceil((days.length + offset) / 7);
    const months: { name: string; week: number }[] = [];
    let lastMonth = -1;
    for (let week = 0; week < weeks; week++) {
      const day = days[Math.max(0, week * 7 - offset)];
      if (!day) continue;
      const date = new Date(`${day.date}T00:00:00Z`);
      if (date.getUTCMonth() !== lastMonth) {
        months.push({ name: date.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' }), week });
        lastMonth = date.getUTCMonth();
      }
    }
    return { days, offset, weeks, months };
  }, [activity.contributions]);
  useEffect(() => { if (scroll.current) scroll.current.scrollLeft = scroll.current.scrollWidth; }, [calendar]);
  const hoverText = hovered ? `${hovered.count} ${hovered.count === 1 ? 'contribution' : 'contributions'} on ${dateLabel(hovered.date)}` : `${activity.total.toLocaleString()} contributions in the past year`;
  const fetchedDate = new Date(activity.fetchedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  return <section className="github-section section-pad" ref={section} aria-labelledby="github-heading">
    <div className="github-intro"><div><span className="eyebrow">THE WORK BETWEEN THE PROJECTS</span><h2 id="github-heading">Still making things.</h2></div><a className="text-link" href={profile.github} target="_blank" rel="noreferrer"><Github size={19} />@Abdullah-Fida</a></div>
    <div className="github-panel"><div className="github-panel-heading"><span><Github size={21} /><strong>My GitHub, in green.</strong></span><span className="github-total"><strong>{activity.total.toLocaleString()}</strong> contributions this past year</span></div>
      <div className="github-scroll" ref={scroll} tabIndex={0} role="region" aria-label="Contribution calendar. Scroll horizontally to see the full year.">
        <svg className="github-calendar" viewBox={`0 0 ${calendar.weeks * 15 + 36} 137`} role="img" aria-label={`Abdullah-Fida: ${activity.total} GitHub contributions from ${dateLabel(calendar.days[0].date)} to ${dateLabel(calendar.days[calendar.days.length - 1].date)}.`}>
          {calendar.months.map(month => <text className="calendar-month" key={`${month.name}-${month.week}`} x={month.week * 15 + 35} y={14}>{month.name}</text>)}
          {[['Mon', 1], ['Wed', 3], ['Fri', 5]].map(([name, row]) => <text className="calendar-day-label" key={name} x={0} y={Number(row) * 15 + 35}>{name}</text>)}
          {calendar.days.map((day, i) => <rect className={`calendar-cell level-${day.level}`} key={day.date} x={Math.floor((i + calendar.offset) / 7) * 15 + 35} y={((i + calendar.offset) % 7) * 15 + 25} width={11} height={11} rx={2} onPointerEnter={() => setHovered(day)} onPointerLeave={() => setHovered(null)}><title>{day.count} {day.count === 1 ? 'contribution' : 'contributions'} on {dateLabel(day.date)}</title></rect>)}
        </svg>
      </div>
      <div className="github-calendar-footer"><span className="github-day-detail">{hoverText}</span><div className="github-legend" aria-label="Contribution intensity, less to more"><span>Less</span>{[0, 1, 2, 3, 4].map(level => <i key={level} className={`level-${level}`} />)}<span>More</span></div></div>
      <div className="github-source-note"><span>{sourceState === 'synced' ? 'Updated from GitHub' : `Last synced ${fetchedDate}`}{sourceState === 'unavailable' ? ' · Latest sync unavailable' : ''}</span><a href={profile.github} target="_blank" rel="noreferrer">See the real profile</a></div>
    </div>
  </section>;
}
