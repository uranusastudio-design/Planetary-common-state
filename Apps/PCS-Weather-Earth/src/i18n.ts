export type Language = 'zh-TW' | 'en' | 'ja' | 'ko';

const messages = {
  'zh-TW': {
    control: '控制面板', weather: '氣象圖層', readiness: '領域資料就緒度', connectedDatasets: '已連接資料集',
    dailyBrief: '每日摘要', evidenceLedger: '證據帳本', provider: '提供者', dataset: '資料集', lastUpdate: '最後更新',
    latency: '資料延遲', validation: '驗證狀態', quality: '資料品質', availability: '可用性', noData: '目前沒有可顯示資料', mobility: '人類移動與大型聚集',
    eventOutcome: '事件結果', timeline: '事件時間線', earliest: '最早可觀測訊號', precursor: '前兆視窗', causal: '候選因果鏈',
    amplification: '放大因素', exposure: '人類暴露', observability: 'PCS 可觀測性', missing: '缺少資料', warning: '候選預警規則',
    interventions: '可能介入點', leadTime: '提前時間', confidence: '信心', datasetsConnected: '個資料集已連接', loading: '讀取中', retry: '重試',
  },
  en: {
    control: 'Control Panel', weather: 'Weather Layers', readiness: 'Domain Readiness', connectedDatasets: 'Connected datasets',
    dailyBrief: 'Daily Brief', evidenceLedger: 'Evidence Ledger', provider: 'Provider', dataset: 'Dataset', lastUpdate: 'Last update',
    latency: 'Data latency', validation: 'Validation status', quality: 'Data quality', availability: 'Availability', noData: 'No data available', mobility: 'Human Mobility & Mass Gathering',
    eventOutcome: 'Event outcome', timeline: 'Event timeline', earliest: 'Earliest detectable signal', precursor: 'Precursor window', causal: 'Causal-chain hypothesis',
    amplification: 'Amplification factors', exposure: 'Human exposure', observability: 'PCS observability', missing: 'Missing data', warning: 'Candidate warning rule',
    interventions: 'Possible intervention points', leadTime: 'Lead time', confidence: 'Confidence', datasetsConnected: 'datasets connected', loading: 'Loading', retry: 'Retry',
  },
  ja: {
    control: 'コントロールパネル', weather: '気象レイヤー', readiness: '領域データ準備状況', connectedDatasets: '接続済みデータセット',
    dailyBrief: 'デイリーブリーフ', evidenceLedger: 'エビデンス台帳', provider: '提供元', dataset: 'データセット', lastUpdate: '最終更新',
    latency: 'データ遅延', validation: '検証状態', quality: 'データ品質', availability: '可用性', noData: '表示できるデータはありません', mobility: '人流・大規模集会',
    eventOutcome: 'イベント結果', timeline: 'イベント時系列', earliest: '最初の検出可能シグナル', precursor: '前兆期間', causal: '因果連鎖仮説',
    amplification: '増幅要因', exposure: '人間の曝露', observability: 'PCS 観測可能性', missing: '欠損データ', warning: '警告ルール候補',
    interventions: '介入候補', leadTime: 'リードタイム', confidence: '信頼度', datasetsConnected: '件のデータセット接続', loading: '読み込み中', retry: '再試行',
  },
  ko: {
    control: '제어판', weather: '기상 레이어', readiness: '도메인 데이터 준비도', connectedDatasets: '연결된 데이터셋',
    dailyBrief: '일일 브리프', evidenceLedger: '증거 원장', provider: '제공자', dataset: '데이터셋', lastUpdate: '최종 업데이트',
    latency: '데이터 지연', validation: '검증 상태', quality: '데이터 품질', availability: '가용성', noData: '표시할 데이터가 없습니다', mobility: '인간 이동 및 대규모 집회',
    eventOutcome: '사건 결과', timeline: '사건 타임라인', earliest: '최초 탐지 가능 신호', precursor: '전조 기간', causal: '인과 사슬 가설',
    amplification: '증폭 요인', exposure: '인간 노출', observability: 'PCS 관측 가능성', missing: '누락 데이터', warning: '후보 경고 규칙',
    interventions: '개입 가능 지점', leadTime: '선행 시간', confidence: '신뢰도', datasetsConnected: '개 데이터셋 연결', loading: '불러오는 중', retry: '다시 시도',
  },
} as const;

export type MessageKey = keyof typeof messages.en;
export function translate(language: Language, key: MessageKey): string { return messages[language][key]; }
export function detectedLanguage(): Language {
  const value = navigator.language.toLowerCase();
  if (value.startsWith('zh')) return 'zh-TW';
  if (value.startsWith('ja')) return 'ja';
  if (value.startsWith('ko')) return 'ko';
  return 'en';
}
