(function initializeReleaseCenter() {
  "use strict";

  const COPY = {
    en: {pcsUpdates:"PCS Updates",latestUpdate:"Latest Update",version:"Version",date:"Date",status:"Status",stable:"Stable",inProgress:"In progress",planned:"Planned",completed:"Completed",deferred:"Deferred",added:"Added",changed:"Changed",fixed:"Fixed",knownIssues:"Known Issues",roadmap:"Roadmap",releaseNotes:"Release Notes",documentation:"Documentation",viewCommit:"View Commit",viewDiff:"View Diff",viewDeployment:"View Deployment",viewDocumentation:"View Documentation",expand:"Expand",collapse:"Collapse",currentDevelopment:"Current Development",next:"Next",milestone:"Milestone",assets:"Assets",knownLimitations:"Known Limitations",latest:"Latest",changelog:"Changelog",commits:"Commits",deployment:"Deployment",releaseDate:"Release date",releaseTitle:"Release title",currentProgress:"Current Progress",loadError:"Release registry could not be loaded.",baseline:"Stable scientific visualization baseline",stableFrozen:"Stable / Frozen",scientificCoverage:"Scientific coverage",earth:"Earth",solarSystem:"Solar System",nearbyStars:"Nearby Stars",milkyWay:"Milky Way",localGroup:"Local Group",openObservatory:"Open Observatory",plannedVersion:"Next version",restoreBanner:"Show release banner"},
    "zh-TW": {pcsUpdates:"PCS 更新",latestUpdate:"最新更新",version:"版本",date:"日期",status:"狀態",stable:"穩定",inProgress:"進行中",planned:"規劃中",completed:"已完成",deferred:"延後",added:"新增",changed:"變更",fixed:"修正",knownIssues:"已知問題",roadmap:"路線圖",releaseNotes:"版本說明",documentation:"文件",viewCommit:"查看 Commit",viewDiff:"查看 Diff",viewDeployment:"查看部署",viewDocumentation:"查看文件",expand:"展開",collapse:"收合",currentDevelopment:"目前開發",next:"下一步",milestone:"里程碑",assets:"資產",knownLimitations:"已知限制",latest:"最新",changelog:"變更紀錄",commits:"提交紀錄",deployment:"部署",releaseDate:"發布日期",releaseTitle:"發行標題",currentProgress:"目前進度",loadError:"無法載入版本登錄資料。",baseline:"穩定科學視覺化基線版本",stableFrozen:"Stable / Frozen",scientificCoverage:"科學涵蓋範圍",earth:"地球",solarSystem:"太陽系",nearbyStars:"太陽鄰近恆星",milkyWay:"銀河系",localGroup:"本星系群",openObservatory:"開啟 Observatory",plannedVersion:"下一版本",restoreBanner:"顯示發布橫幅"},
    ja: {pcsUpdates:"PCS 更新",latestUpdate:"最新更新",version:"バージョン",date:"日付",status:"状態",stable:"安定",inProgress:"進行中",planned:"計画中",completed:"完了",deferred:"延期",added:"追加",changed:"変更",fixed:"修正",knownIssues:"既知の問題",roadmap:"ロードマップ",releaseNotes:"リリースノート",documentation:"ドキュメント",viewCommit:"Commit を表示",viewDiff:"Diff を表示",viewDeployment:"デプロイを表示",viewDocumentation:"文書を表示",expand:"展開",collapse:"折りたたむ",currentDevelopment:"現在の開発",next:"次",milestone:"マイルストーン",assets:"アセット",knownLimitations:"既知の制限",latest:"最新",changelog:"変更履歴",commits:"コミット",deployment:"デプロイ",releaseDate:"リリース日",releaseTitle:"リリース名",currentProgress:"現在の進捗",loadError:"リリース登録を読み込めません。",baseline:"安定版科学可視化ベースライン",stableFrozen:"Stable / Frozen",scientificCoverage:"科学的カバレッジ",earth:"地球",solarSystem:"太陽系",nearbyStars:"太陽近傍星",milkyWay:"天の川銀河",localGroup:"局所銀河群",openObservatory:"Observatory を開く",plannedVersion:"次期バージョン",restoreBanner:"リリースバナーを表示"},
    ko: {pcsUpdates:"PCS 업데이트",latestUpdate:"최신 업데이트",version:"버전",date:"날짜",status:"상태",stable:"안정",inProgress:"진행 중",planned:"계획됨",completed:"완료",deferred:"보류",added:"추가",changed:"변경",fixed:"수정",knownIssues:"알려진 문제",roadmap:"로드맵",releaseNotes:"릴리스 노트",documentation:"문서",viewCommit:"Commit 보기",viewDiff:"Diff 보기",viewDeployment:"배포 보기",viewDocumentation:"문서 보기",expand:"펼치기",collapse:"접기",currentDevelopment:"현재 개발",next:"다음",milestone:"마일스톤",assets:"자산",knownLimitations:"알려진 제한",latest:"최신",changelog:"변경 기록",commits:"커밋",deployment:"배포",releaseDate:"릴리스 날짜",releaseTitle:"릴리스 제목",currentProgress:"현재 진행",loadError:"릴리스 레지스트리를 불러올 수 없습니다.",baseline:"안정적인 과학 시각화 기준 버전",stableFrozen:"Stable / Frozen",scientificCoverage:"과학적 범위",earth:"지구",solarSystem:"태양계",nearbyStars:"태양 근방 항성",milkyWay:"은하수",localGroup:"국부 은하군",openObservatory:"Observatory 열기",plannedVersion:"다음 버전",restoreBanner:"릴리스 배너 표시"}
  };
  const panel = document.querySelector("[data-release-center]");
  if (!panel) return;
  const toggle = panel.querySelector("#pcs-update-toggle");
  const content = panel.querySelector("#pcs-update-content");
  const view = panel.querySelector("#pcs-release-view");
  const coverage = panel.querySelector(".pcs-release-banner__coverage");
  const nextVersion = panel.querySelector(".pcs-release-banner__next");
  const openObservatory = panel.querySelector("#pcs-release-open");
  const releaseNotes = panel.querySelector("#pcs-release-notes");
  const tabs = [...panel.querySelectorAll("[data-release-tab]")];
  let registry = null;
  let activeTab = "latest";
  let expanded = false;
  let releaseCenterOpen = false;
  let focusBeforeExpand = null;

  const language = () => window.PCSI18n?.getLanguage?.() || "en";
  const copy = () => COPY[language()] || COPY.en;
  const localize = (value) => typeof value === "string" ? value : value?.[language()] || value?.en || "";
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, character => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[character]);
  const statusText = (status) => copy()[status === "in-progress" ? "inProgress" : status] || status;
  const list = (items) => `<ul>${items.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
  const externalLink = (href, label, extra = "") => `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" ${extra}>${escapeHtml(label)}</a>`;
  const repositoryUrl = () => registry.repository.replace(/\/$/, "");
  const commitUrl = (hash) => `${repositoryUrl()}/commit/${hash}`;
  const compareUrl = (previous, hash) => `${repositoryUrl()}/compare/${previous}...${hash}`;

  function latestRelease() { return registry.releases.find(release => release.version === registry.currentVersion); }
  function metadata(release) {
    const c = copy();
    return `<dl class="pcs-release-metadata"><div><dt>${c.version}</dt><dd>${escapeHtml(release.version)}</dd></div><div><dt>${c.date}</dt><dd><time datetime="${escapeHtml(release.date)}">${escapeHtml(release.date)}</time></dd></div><div><dt>${c.status}</dt><dd><span class="pcs-release-status" data-status="${escapeHtml(release.status)}">${escapeHtml(statusText(release.status))}</span></dd></div></dl>`;
  }
  function links(release) {
    const c = copy();
    const commits = release.commits.map(item => `<li><span>${escapeHtml(item.label)}</span><code title="${escapeHtml(item.hash)}">${escapeHtml(item.hash.slice(0, 10))}</code><span class="pcs-release-actions">${externalLink(commitUrl(item.hash), c.viewCommit, `aria-label="${escapeHtml(`${c.viewCommit}: ${item.label} ${item.hash}`)}"`)} ${externalLink(compareUrl(item.previous, item.hash), c.viewDiff, `aria-label="${escapeHtml(`${c.viewDiff}: ${item.label}`)}"`)}</span></li>`).join("");
    return `<section><h3>${c.commits}</h3><ul class="pcs-release-link-list">${commits}</ul></section><section><h3>${c.documentation}</h3><ul class="pcs-release-link-list">${release.documentation.map(item => `<li><span>${escapeHtml(item.label)}</span>${externalLink(item.path, c.viewDocumentation)}</li>`).join("")}</ul></section><section><h3>${c.deployment}</h3>${externalLink(release.deploymentUrl, c.viewDeployment)}</section>`;
  }
  function renderLatest(release) {
    const c = copy();
    const active = registry.roadmap.find(item => item.id === registry.currentPhase);
    const next = registry.roadmap.find(item => item.id === "deep-space-phase-4");
    return `${metadata(release)}<div class="pcs-release-grid"><section><h3>${c.latestUpdate}</h3><ul class="pcs-release-checklist">${registry.latestAdditions.map(item => `<li><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.detail)}</span></li>`).join("")}</ul></section><section><h3>${c.milestone}</h3><p><span class="pcs-roadmap-symbol">✔</span> <strong>${escapeHtml(active.title)}</strong><br>${escapeHtml(active.detail)} · ${escapeHtml(statusText(active.status))}</p><h3>${c.next}</h3><p><span class="pcs-roadmap-symbol">○</span> <strong>${escapeHtml(next.title)}</strong><br>${escapeHtml(next.detail)} · ${c.planned}</p></section></div>`;
  }
  function renderChangelog(release) {
    const c = copy();
    return `${metadata(release)}<h3>${escapeHtml(localize(release.title))}</h3><p>${escapeHtml(localize(release.summary))}</p><div class="pcs-release-columns"><section><h3>${c.added}</h3>${list(release.added)}</section><section><h3>${c.changed}</h3>${list(release.changed)}</section><section><h3>${c.fixed}</h3>${list(release.fixed)}</section><section><h3>${c.knownIssues}</h3>${list(release.knownIssues)}</section></div>${links(release)}`;
  }
  function renderRoadmap() {
    const c = copy();
    const symbols = {completed:"✔","in-progress":"▶",planned:"○",blocked:"!",deferred:"◇"};
    return `<h3>${c.currentProgress}</h3><p class="pcs-release-notice">${escapeHtml(registry.currentVersion)} Foundation ${escapeHtml(statusText("in-progress"))} · Phase 4A–4F ${escapeHtml(statusText("planned"))}. No numeric percentage is asserted.</p><ol class="pcs-roadmap">${registry.roadmap.map(item => `<li data-status="${escapeHtml(item.status)}"><span class="pcs-roadmap-symbol">${symbols[item.status]}</span><div><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.detail)}</span></div><span class="pcs-release-status" data-status="${escapeHtml(item.status)}">${escapeHtml(statusText(item.status))}</span></li>`).join("")}</ol>`;
  }
  function renderNotes(release) {
    const c = copy();
    return `<header class="pcs-release-record"><span>PCS Observatory</span><h3>${escapeHtml(localize(release.title))}</h3></header>${metadata(release)}<p>${escapeHtml(localize(release.summary))}</p><section><h3>${c.assets}</h3>${list(release.assets.map(item => `✓ ${item}`))}</section><section><h3>${c.knownLimitations}</h3>${list(release.knownIssues)}</section>${links(release)}`;
  }
  function render() {
    if (!registry) return;
    const c = copy();
    const release = latestRelease();
    panel.querySelector("[data-release-text='pcsUpdates']").textContent = c.pcsUpdates;
    panel.querySelector("#pcs-update-phase").textContent = release.version;
    panel.querySelector("#pcs-update-status").textContent = registry.currentStatus === "stable" ? c.stableFrozen : statusText(registry.currentStatus);
    panel.querySelector("#pcs-update-title").textContent = `PCS Observatory ${release.version}`;
    panel.querySelector("#pcs-update-summary").textContent = c.baseline;
    const coverageLabels = [c.earth, c.solarSystem, c.nearbyStars, c.milkyWay, c.localGroup];
    coverage.innerHTML = coverageLabels.map(label => `<li>${escapeHtml(label)}</li>`).join("");
    coverage.setAttribute("aria-label", c.scientificCoverage);
    const phase4 = registry.roadmap.find(item => item.id === "deep-space-phase-4");
    nextVersion.textContent = registry.currentStatus === "stable" ? `${c.plannedVersion}: ${registry.plannedVersion} — ${statusText(phase4.status)}` : `${registry.currentVersion} — ${c.inProgress}`;
    openObservatory.textContent = c.openObservatory;
    openObservatory.setAttribute("aria-label", c.openObservatory);
    releaseNotes.textContent = c.releaseNotes;
    releaseNotes.setAttribute("aria-label", c.releaseNotes);
    panel.querySelectorAll("[data-release-banner-ready]").forEach(element => { element.hidden = false; });
    toggle.textContent = expanded ? c.collapse : c.expand;
    toggle.setAttribute("aria-label", expanded ? c.collapse : c.restoreBanner);
    toggle.title = expanded ? c.collapse : c.restoreBanner;
    tabs.forEach(tab => { const key = tab.dataset.releaseTab; tab.textContent = c[key === "notes" ? "releaseNotes" : key]; tab.setAttribute("aria-selected", String(key === activeTab)); tab.tabIndex = key === activeTab ? 0 : -1; });
    view.innerHTML = activeTab === "latest" ? renderLatest(release) : activeTab === "changelog" ? renderChangelog(release) : activeTab === "roadmap" ? renderRoadmap() : renderNotes(release);
  }
  function setExpanded(value, restoreFocus = false) {
    expanded = value;
    if (!expanded) {
      releaseCenterOpen = false;
      panel.classList.remove("is-release-center-open");
    }
    panel.classList.toggle("is-collapsed", !expanded);
    toggle.setAttribute("aria-expanded", String(expanded));
    try { sessionStorage.setItem("pcs-release-center-expanded", String(expanded)); } catch {}
    render();
    if (expanded) { focusBeforeExpand = document.activeElement; content.focus({preventScroll:true}); }
    else if (restoreFocus) (focusBeforeExpand instanceof HTMLElement ? focusBeforeExpand : toggle).focus();
  }
  toggle.addEventListener("click", () => setExpanded(!expanded, expanded));
  openObservatory.addEventListener("click", () => {
    const reducedMotion = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    document.querySelector(".dashboard-layout")?.scrollIntoView({behavior:reducedMotion ? "auto" : "smooth", block:"start"});
    document.querySelector("#page-title")?.focus({preventScroll:true});
  });
  releaseNotes.addEventListener("click", () => {
    activeTab = "notes";
    releaseCenterOpen = true;
    panel.classList.add("is-release-center-open");
    if (!expanded) setExpanded(true);
    else render();
    tabs.find(tab => tab.dataset.releaseTab === "notes")?.focus({preventScroll:true});
  });
  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => { activeTab = tab.dataset.releaseTab; render(); });
    tab.addEventListener("keydown", event => { if (!["ArrowLeft","ArrowRight","Home","End"].includes(event.key)) return; event.preventDefault(); const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length; tabs[next].click(); tabs[next].focus(); });
  });
  document.addEventListener("keydown", event => { if (event.key === "Escape" && expanded) setExpanded(false, true); });
  window.addEventListener("pcs:languagechange", render);
  (async () => {
    try {
      const response = await fetch("data/releases.json", {cache:"no-store"});
      if (!response.ok) throw new Error(`Release registry returned ${response.status}`);
      registry = await response.json();
      try {
        const stored = sessionStorage.getItem("pcs-release-center-expanded");
        expanded = stored === null ? true : stored === "true";
      } catch { expanded = true; }
      panel.hidden = false;
      panel.classList.toggle("is-collapsed", !expanded);
      toggle.setAttribute("aria-expanded", String(expanded));
      render();
    } catch (error) {
      panel.hidden = false;
      panel.classList.add("is-unavailable");
      panel.classList.remove("is-collapsed");
      panel.querySelector("#pcs-update-title").textContent = copy().pcsUpdates;
      panel.querySelector("#pcs-update-summary").textContent = copy().loadError;
      toggle.hidden = true;
    }
  })();
})();
