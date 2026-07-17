import { useCallback, useEffect, useState } from 'react';
import { translate, type Language, type MessageKey } from '../i18n';
import type { DomainReadinessResponse, EvidenceEntry, PcsEvent, RetrospectiveAnalysis } from '../types/pcs';

interface Props { backendUrl: string; language: Language; }

const STATUS_LABELS: Record<Language, Record<string, string>> = {
  'zh-TW': { connected: '已連接', live: '即時', delayed: '延遲', unavailable: '不可用', partial: '部分', observed: '實測', inferred: '推論', estimated: '估計', validated: '已驗證', unvalidated: '未驗證', insufficient_data: '資料不足' },
  en: {},
  ja: { connected: '接続済み', live: 'ライブ', delayed: '遅延', unavailable: '利用不可', partial: '一部', observed: '観測', inferred: '推論', estimated: '推定', validated: '検証済み', unvalidated: '未検証', insufficient_data: 'データ不足' },
  ko: { connected: '연결됨', live: '실시간', delayed: '지연', unavailable: '사용 불가', partial: '부분', observed: '관측', inferred: '추론', estimated: '추정', validated: '검증됨', unvalidated: '미검증', insufficient_data: '데이터 부족' },
};

function Status({ value, language }: { value: string; language: Language }) {
  const tone = ['live', 'connected', 'validated', 'observed'].includes(value) ? 'text-emerald-300 border-emerald-500/30' :
    ['delayed', 'partial', 'estimated', 'inferred'].includes(value) ? 'text-amber-300 border-amber-500/30' : 'text-slate-400 border-slate-600/50';
  return <span className={`rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase ${tone}`}>{STATUS_LABELS[language][value] || value}</span>;
}

function formatTime(value: string | null, language: Language) {
  return value ? new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';
}

function Readiness({ data, language }: { data: DomainReadinessResponse | null; language: Language }) {
  const t = (key: MessageKey) => translate(language, key);
  if (!data) return <p className="text-xs text-slate-500">{t('noData')}</p>;
  return <div className="space-y-2">{data.domains.map((domain) => (
    <details key={domain.id} className="group rounded-md border border-panel-border/70 bg-panel-light/30 px-3 py-2">
      <summary className="cursor-pointer list-none" title={domain.datasets.map((item) => `${item.provider}: ${item.dataset}`).join('\n')}>
        <div className="flex items-center justify-between gap-2"><span className="text-xs capitalize text-slate-200">{domain.id.replace(/_/g, ' ')}</span><span className="font-mono text-[10px] text-accent">{domain.connected} / {domain.total} {t('datasetsConnected')}</span></div>
      </summary>
      <div className="mt-3 space-y-3 border-t border-panel-border/50 pt-3">{domain.datasets.map((item) => (
        <div key={item.id} className="text-[10px] text-slate-400">
          <div className="mb-1 flex items-start justify-between gap-2"><span className="text-slate-200">{item.provider} · {item.dataset}</span><Status value={item.status} language={language} /></div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5">
            <dt>{t('lastUpdate')}</dt><dd className="text-right text-slate-300">{formatTime(item.timestamp, language)}</dd>
            <dt>{t('latency')}</dt><dd className="text-right text-slate-300">{item.latency === null ? '—' : `${item.latency} min`}</dd>
            <dt>{t('validation')}</dt><dd className="text-right text-slate-300">{item.validation_status}</dd>
            <dt>{t('quality')}</dt><dd className="text-right text-slate-300">{item.quality_flag}</dd>
            <dt>{t('availability')}</dt><dd className="text-right text-slate-300">{item.availability}</dd>
          </dl>
        </div>
      ))}</div>
    </details>
  ))}</div>;
}

function Value({ value, language }: { value: unknown; language: Language }) {
  if (value === null || value === undefined || (Array.isArray(value) && !value.length)) return <Status value="unavailable" language={language} />;
  return <span className="break-words text-slate-300">{typeof value === 'string' ? value : JSON.stringify(value)}</span>;
}

function Retrospective({ analysis, language }: { analysis: RetrospectiveAnalysis | null | undefined; language: Language }) {
  const t = (key: MessageKey) => translate(language, key);
  if (!analysis) return <p className="text-[11px] text-slate-500">{t('noData')}</p>;
  const rows: Array<[MessageKey, unknown]> = [
    ['earliest', analysis.earliest_detectable_time], ['precursor', analysis.precursor_window_start && analysis.precursor_window_end ? `${analysis.precursor_window_start} – ${analysis.precursor_window_end}` : null],
    ['causal', analysis.causal_chain], ['amplification', analysis.amplification_factors], ['exposure', analysis.exposure_factors],
    ['observability', analysis.pcs_observability], ['missing', analysis.missing_data], ['warning', analysis.proposed_warning_rules],
    ['interventions', analysis.proposed_interventions], ['leadTime', analysis.estimated_lead_time_hours === null ? null : `${analysis.estimated_lead_time_hours} h`],
    ['confidence', analysis.analyst_confidence],
  ];
  return <dl className="space-y-2">{rows.map(([label, value]) => <div key={label}><dt className="text-[9px] uppercase tracking-wider text-slate-500">{t(label)}</dt><dd className="mt-0.5 text-[10px]"><Value value={value} language={language} /></dd></div>)}</dl>;
}

function Events({ events, language, loadEvent }: { events: PcsEvent[]; language: Language; loadEvent: (id: string) => Promise<PcsEvent>; }) {
  const t = (key: MessageKey) => translate(language, key);
  const [details, setDetails] = useState<Record<string, PcsEvent>>({});
  if (!events.length) return <p className="text-xs text-slate-500">{t('noData')}</p>;
  return <div className="space-y-2">{events.map((event) => <details key={event.id} className="rounded-md border border-panel-border/70 bg-panel-light/30 px-3 py-2" onToggle={(e) => { if (e.currentTarget.open && !details[event.id]) void loadEvent(event.id).then((value) => setDetails((current) => ({ ...current, [event.id]: value }))); }}>
    <summary className="cursor-pointer list-none"><div className="flex items-start justify-between gap-2"><span className="text-xs text-slate-200">{event.title}</span><Status value={event.retrospective_analysis?.validation_status || 'unvalidated'} language={language} /></div><p className="mt-1 text-[10px] text-slate-500">{event.region} · {event.event_type}</p></summary>
    <div className="mt-3 border-t border-panel-border/50 pt-3"><h4 className="mb-2 font-mono text-[10px] uppercase tracking-widest text-accent">PCS Retrospective Analysis</h4><div className="mb-2"><span className="text-[9px] uppercase text-slate-500">{t('eventOutcome')}</span><p className="text-[10px] text-slate-300">{event.event_summary || '—'}</p></div><Retrospective analysis={(details[event.id] || event).retrospective_analysis} language={language} /></div>
  </details>)}</div>;
}

function Ledger({ entries, language }: { entries: EvidenceEntry[]; language: Language }) {
  const t = (key: MessageKey) => translate(language, key);
  if (!entries.length) return <p className="text-xs text-slate-500">{t('noData')}</p>;
  return <div className="space-y-2">{entries.map((entry) => <div key={entry.analysis_id} className="rounded-md border border-panel-border/70 bg-panel-light/30 px-3 py-2"><div className="flex justify-between gap-2"><span className="text-[11px] text-slate-200">{entry.region} · {entry.event_type}</span><Status value={entry.result} language={language} /></div><p className="mt-1 text-[10px] text-slate-500">{formatTime(entry.issued_at, language)} · {t('leadTime')}: {entry.lead_time_hours === null ? '—' : `${entry.lead_time_hours} h`}</p>{entry.lessons_learned && <p className="mt-2 text-[10px] text-slate-400">{entry.lessons_learned}</p>}</div>)}</div>;
}

export default function PcsPanels({ backendUrl, language }: Props) {
  const t = (key: MessageKey) => translate(language, key);
  const [readiness, setReadiness] = useState<DomainReadinessResponse | null>(null);
  const [events, setEvents] = useState<PcsEvent[]>([]);
  const [ledger, setLedger] = useState<EvidenceEntry[]>([]);
  const [gatherings, setGatherings] = useState<Array<{ id: string; event_name: string; city: string; data_status: string; source: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setError(null);
    try {
      const [r, e, l, g] = await Promise.all([fetch(`${backendUrl}/api/domain-readiness`), fetch(`${backendUrl}/api/events?limit=20`), fetch(`${backendUrl}/api/evidence-ledger`), fetch(`${backendUrl}/api/mass-gatherings`)]);
      if (!r.ok || !e.ok || !l.ok || !g.ok) throw new Error(`PCS API ${[r.status, e.status, l.status, g.status].join('/')}`);
      const [rd, ev, le, ga] = await Promise.all([r.json(), e.json(), l.json(), g.json()]);
      setReadiness(rd); setEvents(ev.events || []); setLedger(le.entries || []); setGatherings(ga.data || []);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'PCS API unavailable'); }
  }, [backendUrl]);
  useEffect(() => { void load(); }, [load]);
  const loadEvent = useCallback(async (id: string) => { const r = await fetch(`${backendUrl}/api/events/${encodeURIComponent(id)}`); if (!r.ok) throw new Error(`Event ${r.status}`); return r.json(); }, [backendUrl]);

  return <div className="space-y-7">
    {error && <div role="alert" className="rounded border border-red-500/40 bg-red-950/40 p-2 text-[10px] text-red-200">{error} <button className="ml-2 underline" onClick={() => void load()}>{t('retry')}</button></div>}
    <section><h2 className="mb-1 font-mono text-xs uppercase tracking-widest text-slate-400">{t('readiness')}</h2><p className="mb-3 text-[10px] text-slate-500">{t('connectedDatasets')}</p><Readiness data={readiness} language={language} /></section>
    <section><h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-slate-400">{t('dailyBrief')}</h2><Events events={events} language={language} loadEvent={loadEvent} /></section>
    <section><h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-slate-400">{t('mobility')}</h2><div className="grid grid-cols-2 gap-2">{gatherings.map((item) => <div key={item.id} className="rounded-md border border-panel-border/70 bg-panel-light/30 px-2 py-2"><div className="flex items-start justify-between gap-1"><span className="text-[10px] text-slate-200">{item.city}</span><Status value={item.data_status} language={language} /></div><p className="mt-1 text-[9px] text-slate-500">{item.source}</p></div>)}</div>{!gatherings.length && <p className="text-xs text-slate-500">{t('noData')}</p>}</section>
    <section><h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-slate-400">{t('evidenceLedger')}</h2><Ledger entries={ledger} language={language} /></section>
  </div>;
}
