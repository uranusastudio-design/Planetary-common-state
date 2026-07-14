import { useCallback, useEffect, useMemo, useState } from 'react';
import type { VisitorAnalytics, VisitorAnalyticsRange, VisitorLocation, VisitorTrendBucket } from '../types/observatory';
import {
  fetchVisitorAnalytics,
  fetchVisitorLocations,
  observatoryApiUrl,
  VISITOR_ANALYTICS_REFRESH_INTERVAL_MS,
  VISITOR_LOCATIONS_REFRESH_INTERVAL_MS,
} from '../config/observatoryNetwork';

const VISITOR_SESSION_KEY = 'pcs_visitor_session_id';
const REFRESH_INTERVAL_MS = 30_000;
let registeredThisPageView = false;

interface VisitorStats {
  online: number;
  todayVisits: number;
  totalVisits: number;
  uniqueSessions: number;
  countries: number;
  latestVisitor: {
    city: string | null;
    country: string | null;
    timestamp: string;
  } | null;
  lastUpdated: string;
}

type LoadState = 'loading' | 'ready' | 'unavailable';
type AnalyticsState = 'loading' | 'ready' | 'unavailable';

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

function apiUrl(path: string): string {
  return observatoryApiUrl(path);
}

async function postVisitorEvent(path: string, sessionId: string): Promise<void> {
  const response = await fetch(apiUrl(path), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  });

  if (!response.ok) {
    throw new Error(`Visitor API failed: ${response.status}`);
  }
}

async function fetchVisitorStats(): Promise<VisitorStats> {
  const response = await fetch(apiUrl('/api/visitors/stats'), {
    headers: { accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Visitor stats failed: ${response.status}`);
  }

  return response.json() as Promise<VisitorStats>;
}

function formatNumber(value: number | undefined): string {
  return typeof value === 'number' ? value.toLocaleString() : '—';
}

function formatLatestVisitor(stats: VisitorStats | null): string {
  if (!stats?.latestVisitor) return '—';

  const { city, country } = stats.latestVisitor;
  if (city && country) return `${city}, ${country}`;
  if (city) return city;
  if (country) return country;
  return 'Unknown';
}

function formatLocalTime(isoTime: string | undefined): string {
  if (!isoTime) return '—';

  const date = new Date(isoTime);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
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
  const [analyticsRange, setAnalyticsRange] = useState<VisitorAnalyticsRange>('24h');
  const [analyticsState, setAnalyticsState] = useState<AnalyticsState>('loading');
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [lastAnalyticsFetch, setLastAnalyticsFetch] = useState<number>(0);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [mobileOpen, setMobileOpen] = useState(false);

  const unavailable = loadState === 'unavailable';
  const valueOrUnavailable = useCallback(
    (value: string) => (unavailable ? 'Unavailable' : value),
    [unavailable]
  );

  const rows = useMemo(
    () => [
      {
        label: '🟢 ONLINE',
        description: 'Current online visitors',
        value: valueOrUnavailable(formatNumber(stats?.online)),
      },
      {
        label: '👥 TODAY',
        description: "Today's visits",
        value: valueOrUnavailable(formatNumber(stats?.todayVisits)),
      },
      {
        label: '🌍 TOTAL VISITS',
        description: 'Total page visits',
        value: valueOrUnavailable(formatNumber(stats?.totalVisits)),
      },
      {
        label: '🌎 COUNTRIES',
        description: 'Number of unique countries',
        value: valueOrUnavailable(formatNumber(stats?.countries)),
      },
      {
        label: '📍 LATEST',
        description: 'Latest visitor city + country',
        value: valueOrUnavailable(formatLatestVisitor(stats)),
      },
      {
        label: '🕒 UPDATED',
        description: 'Last update time (local time)',
        value: valueOrUnavailable(formatLocalTime(stats?.lastUpdated)),
      },
    ],
    [stats, valueOrUnavailable]
  );

  const refreshStats = useCallback(async () => {
    try {
      const nextStats = await fetchVisitorStats();
      setStats(nextStats);
      setLoadState('ready');
    } catch {
      setLoadState('unavailable');
    }
  }, []);

  const pingIfVisible = useCallback(async (sessionId: string) => {
    if (document.visibilityState !== 'visible') return;

    try {
      await postVisitorEvent('/api/visitors/ping', sessionId);
    } catch {
      setLoadState('unavailable');
    }
  }, []);

  const refreshRecentLocations = useCallback(async () => {
    try {
      const response = await fetchVisitorLocations();
      setRecentLocations(response.locations.slice(0, 5));
    } catch {
      setRecentLocations((current) => current);
    }
  }, []);

  const refreshAnalytics = useCallback(async (range: VisitorAnalyticsRange = analyticsRange) => {
    try {
      const nextAnalytics = await fetchVisitorAnalytics(range);
      setAnalytics(nextAnalytics);
      setAnalyticsState('ready');
      setLastAnalyticsFetch(Date.now());
      onAnalyticsUpdate(nextAnalytics);
    } catch {
      setAnalyticsState('unavailable');
    }
  }, [analyticsRange, onAnalyticsUpdate]);

  const selectAnalyticsRange = useCallback((range: VisitorAnalyticsRange) => {
    setAnalyticsRange(range);
    setAnalyticsState((current) => (current === 'ready' ? current : 'loading'));
    void refreshAnalytics(range);
  }, [refreshAnalytics]);

  useEffect(() => {
    const sessionId = getVisitorSessionId();

    if (!registeredThisPageView) {
      registeredThisPageView = true;
      void postVisitorEvent('/api/visitors/register', sessionId)
        .then(() => Promise.all([refreshStats(), refreshRecentLocations()]))
        .catch(() => setLoadState('unavailable'));
    } else {
      void refreshStats();
      void refreshRecentLocations();
    }

    void refreshAnalytics(analyticsRange);

    const statsInterval = window.setInterval(() => {
      void refreshStats();
    }, REFRESH_INTERVAL_MS);

    const pingInterval = window.setInterval(() => {
      void pingIfVisible(sessionId);
    }, REFRESH_INTERVAL_MS);

    const locationsInterval = window.setInterval(() => {
      void refreshRecentLocations();
    }, VISITOR_LOCATIONS_REFRESH_INTERVAL_MS);

    const analyticsInterval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refreshAnalytics(analyticsRange);
      }
    }, VISITOR_ANALYTICS_REFRESH_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void pingIfVisible(sessionId);
        void refreshStats();
        void refreshRecentLocations();
        if (Date.now() - lastAnalyticsFetch > VISITOR_ANALYTICS_REFRESH_INTERVAL_MS) {
          void refreshAnalytics(analyticsRange);
        }
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
  }, [analyticsRange, lastAnalyticsFetch, pingIfVisible, refreshAnalytics, refreshRecentLocations, refreshStats]);

  return (
    <section className="mb-8 rounded-md border border-panel-border/70 bg-panel-light/40 px-3 py-3 shadow-panel">
      <button
        type="button"
        onClick={() => setMobileOpen((open) => !open)}
        className="flex w-full items-center justify-between text-left sm:pointer-events-none"
        aria-expanded={mobileOpen}
      >
        <h2 className="font-mono text-xs uppercase tracking-widest text-slate-300">
          PCS GLOBAL OBSERVATORY NETWORK
        </h2>
        <span className="font-mono text-[10px] uppercase tracking-wide text-accent sm:hidden">
          {mobileOpen ? 'Hide' : 'Show'}
        </span>
      </button>

      <div className={`${mobileOpen ? 'block' : 'hidden'} mt-3 sm:block`}>
        <dl className="space-y-2 font-mono text-[11px]">
          {rows.map((row) => (
            <div key={row.label} className="rounded border border-panel-border/60 bg-slate-950/30 px-2.5 py-2">
              <div className="flex items-start justify-between gap-3">
                <dt className="text-slate-300">{row.label}</dt>
                <dd className="text-right text-accent">{loadState === 'loading' ? '—' : row.value}</dd>
              </div>
              <p className="mt-0.5 text-[10px] text-slate-500">{row.description}</p>
            </div>
          ))}
        </dl>

        <div className="mt-4 rounded border border-panel-border/60 bg-slate-950/30 px-2.5 py-2 font-mono">
          <h3 className="text-[11px] uppercase tracking-widest text-slate-400">Recent Observation Regions</h3>
          <ul className="mt-2 space-y-1 text-[11px] text-slate-300">
            {recentLocations.length > 0 ? (
              recentLocations.map((location) => (
                <li key={`${location.city}-${location.country}-${location.latitude}-${location.longitude}`}>
                  {formatLocationName(location)}
                </li>
              ))
            ) : (
              <li className="text-slate-500">{loadState === 'unavailable' ? 'Unavailable' : '—'}</li>
            )}
          </ul>
          <div className="mt-3 space-y-1 text-[10px] text-slate-500">
            <p>
              <span className="text-accent">●</span> Active Observation Region
            </p>
            <p>Approximate location only</p>
          </div>
        </div>

        <div className="mt-4 rounded border border-panel-border/60 bg-slate-950/30 px-2.5 py-2 font-mono">
          <button
            type="button"
            onClick={() => setAnalyticsOpen((open) => !open)}
            className="flex w-full items-center justify-between text-left focus:outline-none focus:ring-1 focus:ring-accent sm:pointer-events-none"
            aria-expanded={analyticsOpen}
          >
            <h3 className="text-[11px] uppercase tracking-widest text-slate-400">Observation Analytics</h3>
            <span className="text-[10px] uppercase tracking-wide text-accent sm:hidden">
              {analyticsOpen ? 'Hide' : 'Show'}
            </span>
          </button>

          <div className={`${analyticsOpen ? 'block' : 'hidden'} mt-3 sm:block`}>
            <div className="flex gap-1" role="tablist" aria-label="Observation analytics time range">
              {(['24h', '7d', '30d'] as VisitorAnalyticsRange[]).map((range) => (
                <button
                  key={range}
                  type="button"
                  role="tab"
                  aria-selected={analyticsRange === range}
                  onClick={() => selectAnalyticsRange(range)}
                  className={`rounded border px-2 py-1 text-[10px] uppercase tracking-wide transition-colors focus:outline-none focus:ring-1 focus:ring-accent ${
                    analyticsRange === range
                      ? 'border-accent bg-accent/15 text-accent'
                      : 'border-panel-border bg-slate-950/40 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {range.toUpperCase()}
                </button>
              ))}
            </div>

            <div className="mt-3 flex flex-col gap-2">
              <ToggleRow
                label="Observation Heat"
                checked={observationHeatEnabled}
                onChange={onObservationHeatToggle}
              />
              <ToggleRow
                label="Network Connections"
                checked={networkConnectionsEnabled}
                onChange={onNetworkConnectionsToggle}
              />
            </div>

            <ObservationTrendChart
              buckets={analytics?.trend ?? []}
              range={analyticsRange}
              unavailable={analyticsState === 'unavailable'}
            />

            <div className="mt-4">
              <h3 className="text-[11px] uppercase tracking-widest text-slate-400">Top Observation Countries</h3>
              <ol className="mt-2 space-y-1.5 text-[11px] text-slate-300">
                {analytics?.countryRanking.slice(0, 5).map((country, index) => (
                  <li key={country.countryCode} className="flex items-start justify-between gap-3">
                    <span>
                      {index + 1}. {country.country ?? country.countryCode}
                      <span className="block text-[10px] text-slate-500">
                        {country.uniqueSessions.toLocaleString()} unique sessions
                      </span>
                    </span>
                    <span className="text-right text-accent">{country.visits.toLocaleString()} visits</span>
                  </li>
                )) ?? <li className="text-slate-500">{analyticsState === 'unavailable' ? 'Unavailable' : '—'}</li>}
              </ol>
            </div>

            {analytics?.summary && (
              <p className="mt-3 text-[10px] leading-relaxed text-slate-500">
                Peak {analytics.summary.peakVisits.toLocaleString()} visits
                {analytics.summary.topCountry ? ` · Top country ${analytics.summary.topCountry}` : ''}
                {` · ${analytics.summary.activeRegions.toLocaleString()} active regions`}
              </p>
            )}

            {analyticsState === 'unavailable' && (
              <p className="mt-3 text-[10px] text-amber-300">Analytics unavailable; showing previous data if present.</p>
            )}
          </div>
        </div>

        <p className="mt-3 text-[10px] leading-relaxed text-slate-500">
          Approximate visitor locations are derived from Cloudflare network metadata. No precise address or
          full IP address is displayed.
          <br />
          All activity analytics are aggregated. Individual visitors, full IP addresses, and precise locations are
          not displayed.
        </p>
      </div>
    </section>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded border border-panel-border/60 bg-slate-950/30 px-2 py-1.5 text-[11px] text-slate-300">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-sky-400 focus:outline-none focus:ring-1 focus:ring-accent"
        aria-label={label}
      />
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
  const height = 110;
  const padding = 18;
  const maxVisits = Math.max(1, ...buckets.map((bucket) => bucket.visits));
  const maxSessions = Math.max(1, ...buckets.map((bucket) => bucket.uniqueSessions));
  const maxValue = Math.max(maxVisits, maxSessions);

  const points = (key: 'visits' | 'uniqueSessions') =>
    buckets
      .map((bucket, index) => {
        const x = buckets.length <= 1
          ? padding
          : padding + (index / (buckets.length - 1)) * (width - padding * 2);
        const y = height - padding - (bucket[key] / maxValue) * (height - padding * 2);
        return `${x},${y}`;
      })
      .join(' ');

  const labelBuckets = buckets.filter((_, index) => index === 0 || index === buckets.length - 1);

  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[11px] uppercase tracking-widest text-slate-400">Observation Activity</h3>
        {unavailable && <span className="text-[10px] text-amber-300">Unavailable</span>}
      </div>
      <div className="rounded border border-panel-border/60 bg-slate-950/40 p-2">
        {buckets.length > 0 ? (
          <>
            <svg
              viewBox={`0 0 ${width} ${height}`}
              role="img"
              aria-label="Observation activity line chart"
              className="h-auto w-full"
            >
              <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#334155" />
              <polyline points={points('visits')} fill="none" stroke="#38bdf8" strokeWidth="2" />
              <polyline points={points('uniqueSessions')} fill="none" stroke="#a78bfa" strokeWidth="1.5" opacity="0.85" />
              {buckets.map((bucket, index) => {
                const x = buckets.length <= 1
                  ? padding
                  : padding + (index / (buckets.length - 1)) * (width - padding * 2);
                const y = height - padding - (bucket.visits / maxValue) * (height - padding * 2);
                return (
                  <circle key={bucket.time} cx={x} cy={y} r="2" fill="#38bdf8">
                    <title>
                      {`${formatChartTime(bucket.time, range)} · ${bucket.visits} visits · ${bucket.uniqueSessions} unique sessions`}
                    </title>
                  </circle>
                );
              })}
            </svg>
            <div className="mt-1 flex justify-between text-[9px] text-slate-500">
              {labelBuckets.map((bucket) => (
                <span key={bucket.time}>{formatChartTime(bucket.time, range)}</span>
              ))}
            </div>
            <p className="mt-2 text-[10px] text-slate-500">
              <span className="text-accent">Visits</span>
              <span className="mx-2 text-slate-600">/</span>
              <span className="text-violet-300">Unique sessions</span>
            </p>
          </>
        ) : (
          <p className="py-6 text-center text-[10px] text-slate-500">{unavailable ? 'Chart unavailable' : '—'}</p>
        )}
      </div>
    </div>
  );
}

function formatChartTime(isoTime: string, range: VisitorAnalyticsRange): string {
  const date = new Date(isoTime);
  if (Number.isNaN(date.getTime())) return '—';

  return range === '24h'
    ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function formatLocationName(location: VisitorLocation): string {
  if (location.city && location.country) return `${location.city}, ${location.country}`;
  if (location.city) return location.city;
  if (location.country) return location.country;
  return 'Unknown Region';
}
