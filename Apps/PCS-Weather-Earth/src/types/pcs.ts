export type DataStatus = 'connected' | 'live' | 'delayed' | 'unavailable' | 'partial';
export type EvidenceStatus = 'observed' | 'inferred' | 'estimated' | 'unavailable' | 'delayed' | 'validated' | 'unvalidated';

export interface ProviderDataset {
  id: string;
  domain: string;
  provider: string;
  dataset: string;
  endpoint: string;
  timestamp: string | null;
  latency: number | null;
  quality_flag: string;
  uncertainty: number | null;
  license: string;
  validation_status: string;
  availability: string;
  status: DataStatus;
}

export interface ReadinessDomain { id: string; connected: number; total: number; datasets: ProviderDataset[]; }
export interface DomainReadinessResponse { generated_at: string; domains: ReadinessDomain[]; datasets: ProviderDataset[]; }

export interface TimelineEntry {
  id: number;
  milestone_type: string;
  occurred_at: string | null;
  value_status: EvidenceStatus;
  description: string | null;
  source_url: string | null;
}

export interface RetrospectiveAnalysis {
  analysis_id: string;
  earliest_detectable_time: string | null;
  precursor_window_start: string | null;
  precursor_window_end: string | null;
  estimated_lead_time_hours: number | null;
  precursor_signals: unknown[];
  causal_chain: unknown[];
  amplification_factors: unknown[];
  exposure_factors: unknown[];
  pcs_observability: Record<string, 'high' | 'medium' | 'low' | 'unavailable'>;
  missing_data: string[];
  proposed_warning_rules: unknown[];
  proposed_interventions: unknown[];
  validation_status: string;
  analyst_confidence: number | null;
}

export interface PcsEvent {
  id: string;
  title: string;
  category: string;
  region: string;
  event_type: string;
  event_summary: string | null;
  observed_event_time: string | null;
  published_at: string | null;
  source_name: string | null;
  source_url: string | null;
  confidence: number | null;
  retrospective_analysis?: RetrospectiveAnalysis | null;
  timeline?: TimelineEntry[];
}

export interface EvidenceEntry {
  analysis_id: string;
  event_id: string | null;
  issued_at: string;
  region: string;
  event_type: string;
  lead_time_hours: number | null;
  result: string;
  confidence: number | null;
  data_missing: number;
  lessons_learned: string | null;
}
