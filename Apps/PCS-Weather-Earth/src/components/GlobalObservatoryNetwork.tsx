import { useCallback, useEffect, useMemo, useState } from 'react';
import { PCS_BACKEND_URL } from '../config/weatherLayers';

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
  return `${PCS_BACKEND_URL.replace(/\/$/, '')}${path}`;
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

  useEffect(() => {
    const sessionId = getVisitorSessionId();

    if (!registeredThisPageView) {
      registeredThisPageView = true;
      void postVisitorEvent('/api/visitors/register', sessionId)
        .then(refreshStats)
        .catch(() => setLoadState('unavailable'));
    } else {
      void refreshStats();
    }

    const statsInterval = window.setInterval(() => {
      void refreshStats();
    }, REFRESH_INTERVAL_MS);

    const pingInterval = window.setInterval(() => {
      void pingIfVisible(sessionId);
    }, REFRESH_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void pingIfVisible(sessionId);
        void refreshStats();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(statsInterval);
      window.clearInterval(pingInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pingIfVisible, refreshStats]);

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

        <p className="mt-3 text-[10px] leading-relaxed text-slate-500">
          Approximate visitor locations are derived from Cloudflare network metadata. No precise address or
          full IP address is displayed.
        </p>
      </div>
    </section>
  );
}
