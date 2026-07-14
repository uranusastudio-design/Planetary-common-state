import { useCallback, useEffect, useMemo, useState } from 'react';
import type { VisitorLocation } from '../types/observatory';
import {
  fetchVisitorLocations,
  observatoryApiUrl,
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

export default function GlobalObservatoryNetwork() {
  const [stats, setStats] = useState<VisitorStats | null>(null);
  const [recentLocations, setRecentLocations] = useState<VisitorLocation[]>([]);
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

    const statsInterval = window.setInterval(() => {
      void refreshStats();
    }, REFRESH_INTERVAL_MS);

    const pingInterval = window.setInterval(() => {
      void pingIfVisible(sessionId);
    }, REFRESH_INTERVAL_MS);

    const locationsInterval = window.setInterval(() => {
      void refreshRecentLocations();
    }, VISITOR_LOCATIONS_REFRESH_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void pingIfVisible(sessionId);
        void refreshStats();
        void refreshRecentLocations();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(statsInterval);
      window.clearInterval(pingInterval);
      window.clearInterval(locationsInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pingIfVisible, refreshRecentLocations, refreshStats]);

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

        <p className="mt-3 text-[10px] leading-relaxed text-slate-500">
          Approximate visitor locations are derived from Cloudflare network metadata. No precise address or
          full IP address is displayed.
        </p>
      </div>
    </section>
  );
}

function formatLocationName(location: VisitorLocation): string {
  if (location.city && location.country) return `${location.city}, ${location.country}`;
  if (location.city) return location.city;
  if (location.country) return location.country;
  return 'Unknown Region';
}
