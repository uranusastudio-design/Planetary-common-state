import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  VisitorAnalytics,
  VisitorAnalyticsRange,
  VisitorLocation,
  VisitorMilestone,
  VisitorTrendBucket,
} from '../types/observatory';
import {
  fetchVisitorAnalytics,
  fetchVisitorLocations,
  observatoryApiUrl,
  VISITOR_ANALYTICS_REFRESH_INTERVAL_MS,
  VISITOR_LOCATIONS_REFRESH_INTERVAL_MS,
} from '../config/observatoryNetwork';
import {
  countryFlag,
  formatLocationName,
  formatRelativeObservation,
  groupRecentLocations,
  internationalCountries,
  normalizeCountryName,
} from '../utils/observatory';

const VISITOR_SESSION_KEY = 'pcs_visitor_session_id';
const STATS_REFRESH_INTERVAL_MS = 30_000;
let registeredThisPageView = false;

interface VisitorStats {
  online: number;
  todayVisits: number;
  totalVisits: number;
  uniqueSessions: number;
  countries: number;
  latestVisitor: { city: string | null; country: string | null; timestamp: string } | null;
  lastUpdated: string;
}

type LoadState = 'loading' | 'ready' | 'unavailable';

interface GlobalObservatoryNetworkProps {
  observationHeatEnabled: boolean;
  networkConnectionsEnabled: boolean;
  onObservationHeatToggle: (enabled: boolean) => void;
  onNetworkConnectionsToggle: (enabled: boolean) => void;
  onAnalyticsUpdate: (analytics: VisitorAnalytics) => void;
}

function getVisitorSessionId(): string {
  const existing = window.localStorage.getItem(VISITOR_SESSION_KEY);
  if (existing) return existing;
  const sessionId = crypto.randomUUID();
  window.localStorage.setItem(VISITOR_SESSION_KEY, sessionId);
  return sessionId;
}

async function postVisitorEvent(path: string, sessionId: string): Promise<void> {
  const response = await fetch(observatoryApiUrl(path), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  });
  if (!response.ok) throw new Error(`Visitor API failed: ${response.status}`);
}

async function fetchVisitorStats(): Promise<VisitorStats> {
  const response = await fetch(observatoryApiUrl('/api/visitors/stats'), {
    headers: { accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`Visitor stats failed: ${response.status}`);
  return response.json() as Promise<VisitorStats>;
}

export default function GlobalObservatoryNetwork({
  observationHeatEnabled,
  networkConnectionsEnabled,
  onObservationHeatToggle,
  onNetworkConnectionsToggle,
  onAnalyticsUpdate,
}: GlobalObservatoryNetworkProps) {
  const [stats, setStats] = useState<VisitorStats | null>(null);
  const [recentLocations, setRecentLocations] = useState<VisitorLocation[]>([]);
  const [analytics, setAnalytics] = useState<VisitorAnalytics | null>(null);
  const [dailyAnalytics, setDailyAnalytics] = useState<VisitorAnalytics | null>(null);
  const [analyticsRange, setAnalyticsRange] = useState<VisitorAnalyticsRange>('24h');
  const [statsState, setStatsState] = useState<LoadState>('loading');
  const [analyticsState, setAnalyticsState] = useState<LoadState>('loading');
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const analyticsRangeRef = useRef<VisitorAnalyticsRange>('24h');
  const lastAnalyticsFetchRef = useRef(0);

  const regions = useMemo(() => groupRecentLocations(recentLocations, 10), [recentLocations]);
  const international = useMemo(
    () => internationalCountries(dailyAnalytics?.countryRanking ?? [], 5),
    [dailyAnalytics]
  );

  const cards = useMemo(() => [
    { label: 'ONLINE', value: formatNumber(stats?.online), description: 'Current observers' },
    { label: 'TODAY', value: formatNumber(stats?.todayVisits), description: "Today's visits" },
    { label: 'TOTAL VISITS', value: formatNumber(stats?.totalVisits), description: 'All page visits' },
    { label: 'UNIQUE SESSIONS', value: formatNumber(stats?.uniqueSessions), description: 'Distinct sessions' },
    { label: 'COUNTRIES', value: formatNumber(stats?.countries), description: 'Countries connected' },
    { label: 'LATEST', value: formatLatestVisitor(stats), description: 'Latest region' },
    { label: 'UPDATED', value: formatLocalTime(stats?.lastUpdated), description: 'Local time' },
  ], [stats]);

  const refreshStats = useCallback(async () => {
    try {
      setStats(await fetchVisitorStats());
      setStatsState('ready');
    } catch {
      setStatsState('unavailable');
    }
  }, []);

  const refreshLocations = useCallback(async () => {
    try {
      const response = await fetchVisitorLocations();
      setRecentLocations(response.locations);
    } catch {
      // Preserve the last successful list and let the next scheduled refresh retry.
    }
  }, []);

  const refreshAnalytics = useCallback(async (range: VisitorAnalyticsRange) => {
    try {
      const next = await fetchVisitorAnalytics(range);
      if (range === analyticsRangeRef.current) setAnalytics(next);
      if (range === '24h') {
        setDailyAnalytics(next);
        onAnalyticsUpdate(next);
      }
      setAnalyticsState('ready');
      lastAnalyticsFetchRef.current = Date.now();
    } catch {
      setAnalyticsState('unavailable');
    }
  }, [onAnalyticsUpdate]);

  const refreshCurrentAnalytics = useCallback(async () => {
    const range = analyticsRangeRef.current;
    await refreshAnalytics(range);
    if (range !== '24h') await refreshAnalytics('24h');
  }, [refreshAnalytics]);

  const selectAnalyticsRange = useCallback((range: VisitorAnalyticsRange) => {
    analyticsRangeRef.current = range;
    setAnalyticsRange(range);
    void refreshAnalytics(range);
  }, [refreshAnalytics]);

  const pingIfVisible = useCallback(async (sessionId: string) => {
    if (document.visibilityState !== 'visible') return;
    try {
      await postVisitorEvent('/api/visitors/ping', sessionId);
    } catch {
      setStatsState('unavailable');
    }
  }, []);

  useEffect(() => {
    const sessionId = getVisitorSessionId();
    const start = async () => {
      if (!registeredThisPageView) {
        registeredThisPageView = true;
        try {
          await postVisitorEvent('/api/visitors/register', sessionId);
        } catch {
          setStatsState('unavailable');
        }
      }
      await Promise.all([refreshStats(), refreshLocations(), refreshCurrentAnalytics()]);
    };
    void start();

    const statsInterval = window.setInterval(() => void refreshStats(), STATS_REFRESH_INTERVAL_MS);
    const pingInterval = window.setInterval(() => void pingIfVisible(sessionId), STATS_REFRESH_INTERVAL_MS);
    const locationsInterval = window.setInterval(() => void refreshLocations(), VISITOR_LOCATIONS_REFRESH_INTERVAL_MS);
    const analyticsInterval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refreshCurrentAnalytics();
    }, VISITOR_ANALYTICS_REFRESH_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      void pingIfVisible(sessionId);
      void refreshStats();
      void refreshLocations();
      if (Date.now() - lastAnalyticsFetchRef.current >= VISITOR_ANALYTICS_REFRESH_INTERVAL_MS) {
        void refreshCurrentAnalytics();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.clearInterval(statsInterval);
      window.clearInterval(pingInterval);
      window.clearInterval(locationsInterval);
      window.clearInterval(analyticsInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pingIfVisible, refreshCurrentAnalytics, refreshLocations, refreshStats]);

  return (
    <section className="mb-8 min-w-0 rounded-md border border-panel-border/70 bg-panel-light/40 p-3 shadow-panel">
      <button
        type="button"
        onClick={() => setMobileOpen((open) => !open)}
        className="flex w-full items-center justify-between gap-3 text-left sm:pointer-events-none"
        aria-expanded={mobileOpen}
      >
        <h2 className="font-mono text-xs uppercase tracking-widest text-slate-300">PCS Global Observatory Network</h2>
        <span className="font-mono text-[10px] uppercase tracking-wide text-accent sm:hidden">
          {mobileOpen ? 'Hide' : 'Show'}
        </span>
      </button>

      <div className={`${mobileOpen ? 'block' : 'hidden'} mt-3 min-w-0 sm:block`}>
        <dl className="grid grid-cols-2 gap-2 font-mono text-[10px]">
          {cards.map((card) => (
            <div key={card.label} className="min-w-0 rounded border border-panel-border/60 bg-slate-950/30 p-2">
              <dt className="truncate uppercase tracking-wide text-slate-400">{card.label}</dt>
              <dd className="mt-1 break-words text-sm text-accent">
                {statsState === 'loading' ? '—' : statsState === 'unavailable' ? 'Unavailable' : card.value}
              </dd>
              <p className="mt-0.5 text-[9px] text-slate-600">{card.description}</p>
            </div>
          ))}
        </dl>

        <div className="mt-3 space-y-1 rounded border border-panel-border/60 bg-slate-950/30 p-2.5 font-mono text-[10px] text-slate-400">
          <p>{(stats?.online ?? 0) > 1 ? 'Other observers are online.' : 'No other active observers right now.'}</p>
          <p>{international.length > 0 ? 'International observations detected.' : 'No international observations detected today.'}</p>
        </div>

        <Panel title="International Observations">
          {international.length > 0 ? (
            <ol className="space-y-2">
              {international.map((country) => (
                <li key={country.countryCode} className="flex items-start justify-between gap-3 text-[11px]">
                  <span className="min-w-0 text-slate-300">
                    <span aria-hidden="true">{countryFlag(country.countryCode, country.country)}</span>{' '}
                    {country.country ?? country.countryCode}
                  </span>
                  <span className="shrink-0 text-right text-accent">
                    {country.visits.toLocaleString()} {country.visits === 1 ? 'visit' : 'visits'}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-[11px] text-slate-500">No international observations in the last 24 hours.</p>
          )}
        </Panel>

        <Panel title="Recent Observation Regions">
          {regions.length > 0 ? (
            <ol className="space-y-2.5">
              {regions.map((location) => (
                <li key={`${location.city}-${location.countryCode}-${location.latitude}-${location.longitude}`}>
                  <p className="text-[11px] text-slate-300">
                    <span aria-hidden="true">{countryFlag(location.countryCode, location.country)}</span>{' '}
                    {formatLocationName(location)}
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-500">
                    <span className={formatRelativeObservation(location.lastSeen) === 'Active now' ? 'text-emerald-300' : ''}>
                      {formatRelativeObservation(location.lastSeen)}
                    </span>
                    {location.count > 1 ? ` · ${location.count.toLocaleString()} visits` : ''}
                  </p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-[11px] text-slate-500">No observation regions recorded yet.</p>
          )}
        </Panel>

        <Panel title="Observation Analytics" collapsible open={analyticsOpen} onToggle={() => setAnalyticsOpen((open) => !open)}>
          <div className="flex gap-1" role="tablist" aria-label="Observation analytics time range">
            {(['24h', '7d', '30d'] as VisitorAnalyticsRange[]).map((range) => (
              <button
                key={range}
                type="button"
                role="tab"
                aria-selected={analyticsRange === range}
                onClick={() => selectAnalyticsRange(range)}
                className={`rounded border px-2 py-1 text-[10px] uppercase tracking-wide focus:outline-none focus:ring-1 focus:ring-accent ${
                  analyticsRange === range
                    ? 'border-accent bg-accent/15 text-accent'
                    : 'border-panel-border bg-slate-950/40 text-slate-400'
                }`}
              >
                {range.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="mt-3 space-y-2">
            <ToggleRow label="Observation Heat" checked={observationHeatEnabled} onChange={onObservationHeatToggle} />
            <ToggleRow label="Network Connections" checked={networkConnectionsEnabled} onChange={onNetworkConnectionsToggle} />
          </div>
          <ObservationTrendChart
            buckets={analytics?.trend ?? []}
            range={analyticsRange}
            unavailable={analyticsState === 'unavailable'}
          />
          <div className="mt-4">
            <h4 className="text-[10px] uppercase tracking-widest text-slate-500">Top Observation Countries</h4>
            <ol className="mt-2 space-y-1.5 text-[11px] text-slate-300">
              {(analytics?.countryRanking ?? []).slice(0, 5).map((country, index) => (
                <li key={country.countryCode} className="flex justify-between gap-3">
                  <span>{index + 1}. {country.country ?? country.countryCode}</span>
                  <span className="shrink-0 text-accent">{country.visits.toLocaleString()} visits</span>
                </li>
              ))}
              {!analytics?.countryRanking.length && (
                <li className="text-slate-500">{analyticsState === 'unavailable' ? 'Unavailable' : '—'}</li>
              )}
            </ol>
          </div>
          {analyticsState === 'unavailable' && analytics && (
            <p className="mt-3 text-[10px] text-amber-300">Analytics unavailable; previous data remains visible.</p>
          )}
        </Panel>

        <div className="mt-4 rounded border border-panel-border/60 bg-slate-950/30 p-2.5 font-mono">
          <h3 className="text-[11px] uppercase tracking-widest text-slate-400">About</h3>
          <section className="mt-3" aria-labelledby="pcs-observatory-milestones-title">
            <h4 id="pcs-observatory-milestones-title" className="text-[10px] uppercase tracking-widest text-slate-500">
              PCS Observatory Milestones
            </h4>
            <MilestoneList milestones={dailyAnalytics?.milestones ?? []} />
          </section>
        </div>

        <div className="mt-3 space-y-2 text-[10px] leading-relaxed text-slate-500">
          <p>
            Approximate visitor locations are derived from Cloudflare network metadata.<br />
            No precise address or full IP address is displayed.<br />
            Visitor activity is aggregated and cannot identify a specific individual.
          </p>
          <p lang="zh-Hant">
            訪客的大致位置來自 Cloudflare 網路中繼資料。<br />
            不會顯示精確地址或完整 IP 位址。<br />
            訪客活動經過彙總，無法識別特定個人。
          </p>
        </div>
      </div>
    </section>
  );
}

function Panel({
  title,
  children,
  collapsible = false,
  open = true,
  onToggle,
}: {
  title: string;
  children: React.ReactNode;
  collapsible?: boolean;
  open?: boolean;
  onToggle?: () => void;
}) {
  return (
    <div className="mt-4 min-w-0 rounded border border-panel-border/60 bg-slate-950/30 p-2.5 font-mono">
      {collapsible ? (
        <button type="button" onClick={onToggle} className="flex w-full justify-between text-left" aria-expanded={open}>
          <h3 className="text-[11px] uppercase tracking-widest text-slate-400">{title}</h3>
          <span className="text-[10px] uppercase text-accent sm:hidden">{open ? 'Hide' : 'Show'}</span>
        </button>
      ) : (
        <h3 className="text-[11px] uppercase tracking-widest text-slate-400">{title}</h3>
      )}
      <div className={`${collapsible && !open ? 'hidden' : 'block'} mt-3 sm:block`}>{children}</div>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded border border-panel-border/60 bg-slate-950/30 px-2 py-1.5 text-[11px] text-slate-300">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-sky-400" />
    </label>
  );
}

function ObservationTrendChart({
  buckets,
  range,
  unavailable,
}: {
  buckets: VisitorTrendBucket[];
  range: VisitorAnalyticsRange;
  unavailable: boolean;
}) {
  const width = 260;
  const height = 100;
  const padding = 16;
  const maxValue = Math.max(1, ...buckets.flatMap((bucket) => [bucket.visits, bucket.uniqueSessions]));
  const points = (key: 'visits' | 'uniqueSessions') => buckets.map((bucket, index) => {
    const x = buckets.length <= 1 ? padding : padding + (index / (buckets.length - 1)) * (width - padding * 2);
    const y = height - padding - (bucket[key] / maxValue) * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="mt-4">
      <div className="mb-2 flex justify-between">
        <h4 className="text-[10px] uppercase tracking-widest text-slate-500">Observation Activity</h4>
        {unavailable && <span className="text-[10px] text-amber-300">Unavailable</span>}
      </div>
      <div className="rounded border border-panel-border/60 bg-slate-950/40 p-2">
        {buckets.length > 0 ? (
          <>
            <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Observation activity line chart" className="h-auto w-full">
              <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#334155" />
              <polyline points={points('visits')} fill="none" stroke="#38bdf8" strokeWidth="2" />
              <polyline points={points('uniqueSessions')} fill="none" stroke="#a78bfa" strokeWidth="1.5" opacity="0.85" />
            </svg>
            <div className="flex justify-between text-[9px] text-slate-500">
              <span>{formatChartTime(buckets[0].time, range)}</span>
              <span>{formatChartTime(buckets[buckets.length - 1].time, range)}</span>
            </div>
            <p className="mt-2 text-[10px] text-slate-500"><span className="text-accent">Visits</span> / <span className="text-violet-300">Unique sessions</span></p>
          </>
        ) : (
          <p className="py-6 text-center text-[10px] text-slate-500">{unavailable ? 'Chart unavailable' : '—'}</p>
        )}
      </div>
    </div>
  );
}

function MilestoneList({ milestones }: { milestones: VisitorMilestone[] }) {
  if (milestones.length === 0) return <p className="mt-2 text-[10px] text-slate-500">Milestones will appear from observation data.</p>;
  return (
    <ol className="mt-2 space-y-3">
      {milestones.map((milestone) => (
        <li key={`${milestone.kind}-${milestone.threshold ?? 0}`} className="border-l border-accent/40 pl-2">
          <p className="text-[11px] text-slate-300">{milestone.title}</p>
          <p className="text-[10px] text-slate-500">
            {new Date(milestone.achievedAt).toLocaleDateString()}
            {milestone.city || milestone.country ? ` · ${[milestone.city, milestone.country].filter(Boolean).join(', ')}` : ''}
          </p>
          <p className="mt-1 text-[10px] leading-relaxed text-slate-500">{milestone.description}</p>
        </li>
      ))}
    </ol>
  );
}

function formatNumber(value: number | undefined): string {
  return typeof value === 'number' ? value.toLocaleString() : '—';
}

function formatLatestVisitor(stats: VisitorStats | null): string {
  if (!stats?.latestVisitor) return '—';
  const country = normalizeCountryName(stats.latestVisitor.country, stats.latestVisitor.country);
  return [stats.latestVisitor.city, country].filter(Boolean).join(', ') || 'Unknown';
}

function formatLocalTime(isoTime: string | undefined): string {
  if (!isoTime) return '—';
  const date = new Date(isoTime);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatChartTime(isoTime: string, range: VisitorAnalyticsRange): string {
  const date = new Date(isoTime);
  if (Number.isNaN(date.getTime())) return '—';
  return range === '24h'
    ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
