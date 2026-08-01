(function exposeDeepSpaceManager(global) {
  "use strict";
  const DS = global.PCSDeepSpaceRegistry;
  const Eph = global.PCSDeepSpaceEphemeris;
  if (!DS || !Eph) return;

  const COPY = {
    en:{title:"PCS DEEP SPACE",scale:"Scale",time:"Time",objects:"Objects",orbits:"Orbits",labels:"Labels",data:"Data",close:"Close Deep Space",reset:"Reset view",earth:"Return to Earth",solar:"Return to Solar System",follow:"Follow selected body",top:"Top view",inclined:"Inclined view",scientific:"Scientific Scale",exhibition:"Exhibition Scale",play:"Play",pause:"Pause",now:"Reset to now",phase2:"Nearby Stars — Available in Phase 2",noticeEx:"Exhibition scale — Distances visually compressed — Not a single linear scale",noticeSci:"Scientific scale — radii and distances use the same linear kilometre scale",ephemeris:"Ephemeris-based orbital visualization",approx:"Orbital-element approximation — Not mission-navigation precision",collapse:"Collapse controls",expand:"Expand controls",retry:"Retry",cached:"Use cached ephemeris",fallback:"Use orbital approximation",later:"Available in a later phase"},
    "zh-TW":{title:"PCS 深空",scale:"尺度",time:"時間",objects:"天體",orbits:"軌道",labels:"標籤",data:"資料",close:"關閉深空",reset:"重設視角",earth:"返回地球",solar:"返回太陽系",follow:"跟隨所選天體",top:"俯視",inclined:"傾斜視角",scientific:"科學比例",exhibition:"展演比例",play:"播放",pause:"暫停",now:"重設為現在",phase2:"鄰近恆星 — Phase 2 開放",noticeEx:"展演比例 — 距離經視覺壓縮 — 並非單一線性比例",noticeSci:"科學比例 — 半徑與距離採用相同公里線性比例",ephemeris:"基於星曆的軌道視覺化",approx:"軌道元素近似 — 非任務導航精度",collapse:"收合控制列",expand:"展開控制列",retry:"重試",cached:"使用快取星曆",fallback:"使用軌道近似",later:"後續階段開放"},
    ja:{title:"PCS ディープスペース",scale:"スケール",time:"時間",objects:"天体",orbits:"軌道",labels:"ラベル",data:"データ",close:"閉じる",reset:"ビューをリセット",earth:"地球へ戻る",solar:"太陽系へ戻る",follow:"選択天体を追跡",top:"トップビュー",inclined:"傾斜ビュー",scientific:"科学スケール",exhibition:"展示スケール",play:"再生",pause:"一時停止",now:"現在に戻す",phase2:"近傍恒星 — Phase 2で利用可能",noticeEx:"展示スケール — 距離を視覚的に圧縮 — 単一線形スケールではありません",noticeSci:"科学スケール — 半径と距離は同一のkm線形比率",ephemeris:"暦に基づく軌道可視化",approx:"軌道要素による近似 — 航法精度ではありません",collapse:"操作を折りたたむ",expand:"操作を展開",retry:"再試行",cached:"キャッシュ暦を使用",fallback:"軌道近似を使用",later:"今後のフェーズで利用可能"},
    ko:{title:"PCS 딥 스페이스",scale:"축척",time:"시간",objects:"천체",orbits:"궤도",labels:"레이블",data:"데이터",close:"딥 스페이스 닫기",reset:"보기 초기화",earth:"지구로 돌아가기",solar:"태양계로 돌아가기",follow:"선택 천체 추적",top:"평면 보기",inclined:"경사 보기",scientific:"과학 축척",exhibition:"전시 축척",play:"재생",pause:"일시정지",now:"현재로 재설정",phase2:"인접 항성 — Phase 2에서 제공",noticeEx:"전시 축척 — 거리를 시각적으로 압축 — 단일 선형 축척 아님",noticeSci:"과학 축척 — 반지름과 거리에 동일한 km 선형 축척 사용",ephemeris:"천체력 기반 궤도 시각화",approx:"궤도 요소 근사 — 임무 항법 정밀도 아님",collapse:"컨트롤 접기",expand:"컨트롤 펼치기",retry:"다시 시도",cached:"캐시 천체력 사용",fallback:"궤도 근사 사용",later:"추후 단계에서 제공"},
  };
  const SPEEDS = Object.freeze({"1×":1,"60×":60,"1 hour / second":3600,"1 day / second":86400,"30 days / second":2592000});
  const CONNECTIVITY = Object.freeze({
    en:{online:"Online — cached JPL vector preferred at matching epoch",offline:"Offline — local cache and orbital approximation remain available"},
    "zh-TW":{online:"已連線 — epoch 相符時優先使用本地 JPL 快取",offline:"離線模式 — 本地星曆快取與軌道近似仍可使用"},
    ja:{online:"オンライン — epoch一致時はJPLキャッシュを優先",offline:"オフライン — ローカル暦と軌道近似を利用可能"},
    ko:{online:"온라인 — epoch 일치 시 JPL 캐시 우선",offline:"오프라인 — 로컬 천체력과 궤도 근사 사용 가능"},
  });
  const PLANETS = DS.PLANET_IDS;
  let viewer, host, overlay, viewport, sourceParent, sourceNext, dataSource, clickHandler, tickRemover;
  let active=false, paused=false, speed=1, epoch=new Date(), lastTick=0, mode="exhibition", selected="sun", focusParent=null, follow=false;
  let saved={};
  const orbitCache = new Map();

  const l=()=>COPY[global.PCSI18n?.getLanguage?.()]||COPY.en;
  const q=(selector)=>overlay?.querySelector(selector);
  const body=(id)=>DS.BODY_REGISTRY[id];
  const exhibitionDistance=(distanceAu)=> distanceAu===0?0:(250000+Math.log10(1+distanceAu)*1550000);
  const positionFor=(id,state)=>{
    if (!state) return null;
    const factor=mode==="scientific"?Eph.AU_KM:1;
    const distance=state.heliocentricDistanceAu ?? Math.hypot(...state.positionAu);
    const mapped=mode==="scientific"?distance*factor:exhibitionDistance(distance);
    const norm=Math.max(distance,1e-12);
    return new Cesium.Cartesian3(...state.positionAu.map((value)=>value/norm*mapped));
  };
  const radiusFor=(entry)=> mode==="scientific"?entry.radiusKm:Math.max(8000,Math.log10(entry.radiusKm+10)*3700);

  function template(){
    return `<section class="deep-space-shell" role="dialog" aria-modal="true" aria-labelledby="deep-space-title">
      <header class="deep-space-header"><div><strong id="deep-space-title"></strong><span data-ds-level>Level 2 — Solar System</span></div><div><time data-ds-epoch></time><button data-ds-collapse type="button"></button><button data-ds-close type="button" class="deep-space-close"></button></div></header>
      <div class="deep-space-viewport" data-ds-viewport></div>
      <aside class="deep-space-controls" data-ds-controls><p class="deep-space-connectivity" data-ds-connectivity role="status"></p>
        <section><h2 data-copy="scale"></h2><div class="deep-space-row"><button data-mode="exhibition"></button><button data-mode="scientific"></button></div><p data-ds-scale-notice></p></section>
        <section><h2 data-copy="time"></h2><div class="deep-space-row"><button data-ds-play></button><select data-ds-speed aria-label="Playback speed">${Object.keys(SPEEDS).map((name)=>`<option>${name}</option>`).join("")}</select><button data-ds-step="-1">−1 d</button><button data-ds-step="1">+1 d</button><button data-ds-now></button></div><p data-ds-status></p></section>
        <section><h2 data-copy="objects"></h2><div class="deep-space-object-list">${["sun",...PLANETS].map((id)=>`<button data-body="${id}">${body(id).name}</button>`).join("")}</div><p data-ds-phase2></p><p>Comets — <span data-ds-later></span><br>Asteroids — <span data-ds-later></span></p></section>
        <section><h2 data-copy="orbits"></h2><div class="deep-space-row"><label><input data-ds-orbits type="checkbox" checked> <span data-copy="orbits"></span></label><label><input data-ds-labels type="checkbox" checked> <span data-copy="labels"></span></label></div></section>
        <section><h2 data-copy="data"></h2><div data-ds-info class="deep-space-info"></div></section>
        <section class="deep-space-actions"><button data-ds-reset></button><button data-ds-solar></button><button data-ds-earth></button><button data-ds-follow></button><button data-ds-top></button><button data-ds-inclined></button></section>
      </aside><div class="deep-space-error" data-ds-error hidden role="alert"></div>
    </section>`;
  }
  function translate(){
    if(!overlay)return; const c=l(); q("#deep-space-title").textContent=c.title; q("[data-ds-close]").textContent=c.close;
    overlay.querySelectorAll("[data-copy]").forEach((el)=>el.textContent=c[el.dataset.copy]);
    q('[data-mode="exhibition"]').textContent=c.exhibition;q('[data-mode="scientific"]').textContent=c.scientific;q("[data-ds-play]").textContent=paused?c.play:c.pause;q("[data-ds-now]").textContent=c.now;q("[data-ds-phase2]").textContent=c.phase2;
    overlay.querySelectorAll("[data-ds-later]").forEach((el)=>el.textContent=c.later);
    [["[data-ds-reset]","reset"],["[data-ds-solar]","solar"],["[data-ds-earth]","earth"],["[data-ds-follow]","follow"],["[data-ds-top]","top"],["[data-ds-inclined]","inclined"]].forEach(([s,k])=>q(s).textContent=c[k]);
    q("[data-ds-collapse]").textContent=q("[data-ds-controls]").classList.contains("is-collapsed")?c.expand:c.collapse;
    const connectivity=CONNECTIVITY[global.PCSI18n?.getLanguage?.()]||CONNECTIVITY.en;q("[data-ds-connectivity]").textContent=navigator.onLine?connectivity.online:connectivity.offline;q("[data-ds-connectivity]").classList.toggle("is-offline",!navigator.onLine);
    q("[data-ds-scale-notice]").textContent=mode==="scientific"?c.noticeSci:c.noticeEx; renderInfo();
  }
  function setupOverlay(){
    overlay=document.createElement("div");overlay.className="deep-space-overlay";overlay.hidden=true;overlay.innerHTML=template();document.body.append(overlay);viewport=q("[data-ds-viewport]");translate();
    q("[data-ds-close]").addEventListener("click",close);q("[data-ds-collapse]").addEventListener("click",()=>{q("[data-ds-controls]").classList.toggle("is-collapsed");translate();});
    overlay.querySelectorAll("[data-mode]").forEach((b)=>b.addEventListener("click",()=>{mode=b.dataset.mode;renderAll();resetView();}));
    overlay.querySelectorAll("[data-body]").forEach((b)=>b.addEventListener("click",()=>selectBody(b.dataset.body)));
    q("[data-ds-play]").addEventListener("click",()=>{paused=!paused;translate();});q("[data-ds-speed]").addEventListener("change",(e)=>{speed=SPEEDS[e.target.value];});
    overlay.querySelectorAll("[data-ds-step]").forEach((b)=>b.addEventListener("click",()=>{epoch=new Date(epoch.getTime()+Number(b.dataset.dsStep)*86400000);updatePositions();}));
    q("[data-ds-now]").addEventListener("click",()=>{epoch=new Date();updatePositions();});q("[data-ds-reset]").addEventListener("click",resetView);q("[data-ds-solar]").addEventListener("click",()=>{focusParent=null;selected="sun";renderAll();resetView();});q("[data-ds-earth]").addEventListener("click",()=>{close();document.querySelector('[data-solar-target="earth"]')?.click();});
    q("[data-ds-follow]").addEventListener("click",()=>{follow=!follow;q("[data-ds-follow]").classList.toggle("is-active",follow);});q("[data-ds-top]").addEventListener("click",()=>setCamera("top"));q("[data-ds-inclined]").addEventListener("click",()=>setCamera("inclined"));
    q("[data-ds-orbits]").addEventListener("change",renderAll);q("[data-ds-labels]").addEventListener("change",()=>dataSource.entities.values.forEach((e)=>{if(e.label)e.label.show=q("[data-ds-labels]").checked;}));
    overlay.addEventListener("keydown",trapFocus);global.addEventListener("pcs:languagechange",translate);global.addEventListener("online",translate);global.addEventListener("offline",translate);
  }
  function orbitPoints(id){const key=`${mode}:${id}`;if(orbitCache.has(key))return orbitCache.get(key);const points=[];const start=Date.parse("2000-01-01T12:00:00Z");const period=body(id).orbitalPeriodDays;for(let i=0;i<=180;i++){const s=Eph.getFallbackOrbitalState(id,new Date(start+period*86400000*i/180));points.push(positionFor(id,s));}orbitCache.set(key,points);return points;}
  function addEntity(entry,state,parentPosition){
    let position=parentPosition||positionFor(entry.id,state);if(!position)return;
    if(parentPosition){const rel=Eph.getSatelliteRelativeState(entry.id,epoch);const compression=mode==="scientific"?1:Math.max(18,150000/Math.max(entry.meanOrbitalRadiusKm,1));position=Cesium.Cartesian3.add(parentPosition,new Cesium.Cartesian3(...rel.positionAu.map(v=>v*Eph.AU_KM*compression)),new Cesium.Cartesian3());}
    const entity=dataSource.entities.add({id:`deep-space-${entry.id}`,name:entry.name,position,ellipsoid:{radii:new Cesium.Cartesian3(radiusFor(entry),radiusFor(entry),radiusFor(entry)),material:Cesium.Color.fromCssColorString(entry.color),outline:true,outlineColor:Cesium.Color.WHITE.withAlpha(.28)},label:{text:entry.name,font:"13px system-ui",fillColor:Cesium.Color.WHITE,outlineColor:Cesium.Color.BLACK,outlineWidth:3,style:Cesium.LabelStyle.FILL_AND_OUTLINE,pixelOffset:new Cesium.Cartesian2(0,-18),show:q("[data-ds-labels]").checked},properties:{deepSpaceBodyId:entry.id}});return entity;
  }
  function renderAll(){
    if(!dataSource)return;dataSource.entities.removeAll();const showOrbits=q("[data-ds-orbits]").checked;
    addEntity(body("sun"),Eph.getBodyState("sun",epoch));
    PLANETS.forEach((id)=>{const state=Eph.getBodyState(id,epoch);const entity=addEntity(body(id),state);if(showOrbits)dataSource.entities.add({id:`deep-space-orbit-${id}`,polyline:{positions:orbitPoints(id),width:id===selected?2:1,material:Cesium.Color.fromCssColorString(body(id).color).withAlpha(.42)}});if(focusParent===id&&entity){const parentPosition=entity.position.getValue(Cesium.JulianDate.now());DS.SATELLITE_IDS.filter(s=>body(s).parentBodyId===id).forEach(s=>addEntity(body(s),null,parentPosition));}});
    updatePositions();translate();viewer.scene.requestRender();
  }
  function updatePositions(){
    if(!active)return;PLANETS.forEach((id)=>{const entity=dataSource.entities.getById(`deep-space-${id}`);if(entity)entity.position=positionFor(id,Eph.getBodyState(id,epoch));});
    if(focusParent){const p=dataSource.entities.getById(`deep-space-${focusParent}`)?.position?.getValue(Cesium.JulianDate.now());DS.SATELLITE_IDS.filter(s=>body(s).parentBodyId===focusParent).forEach((id)=>{const entity=dataSource.entities.getById(`deep-space-${id}`),rel=Eph.getSatelliteRelativeState(id,epoch);if(entity&&p&&rel){const compression=mode==="scientific"?1:Math.max(18,150000/body(id).meanOrbitalRadiusKm);entity.position=Cesium.Cartesian3.add(p,new Cesium.Cartesian3(...rel.positionAu.map(v=>v*Eph.AU_KM*compression)),new Cesium.Cartesian3());}});}
    q("[data-ds-epoch]").textContent=epoch.toISOString().replace(".000","");q("[data-ds-status]").textContent=`${l().approx} · ${DS.FRAME}`;renderInfo();viewer.scene.requestRender();
    if(follow){const e=dataSource.entities.getById(`deep-space-${selected}`);if(e)viewer.trackedEntity=e;}
  }
  function renderInfo(){if(!overlay)return;const entry=body(selected),state=Eph.getBodyState(entry.parentBodyId?selected:"sun",epoch);const rows=[["Name",entry.name],["Object type",entry.type],["Parent system",entry.parentBodyId?body(entry.parentBodyId)?.name:null],["Mean radius",`${entry.radiusKm.toLocaleString()} km`],["Current heliocentric distance",state?.heliocentricDistanceAu!=null?`${state.heliocentricDistanceAu.toFixed(6)} AU`:null],["Position epoch",epoch.toISOString()],["Coordinate frame",entry.coordinateFrame],["Orbital period",entry.orbitalPeriodDays?`${entry.orbitalPeriodDays.toLocaleString()} days`:null],["Rotation period",entry.rotationPeriodDays?`${entry.rotationPeriodDays.toLocaleString()} days`:null],["Data source",entry.orbitalDataSource||entry.ephemerisSource],["Data status",state?.dataStatus||entry.dataStatus],["Visualization scale",mode],["Notice",entry.id==="titania"?`${entry.uncertainty} Known issue: mission texture has incomplete lower-hemisphere coverage; repair deferred.`:entry.uncertainty]];q("[data-ds-info]").innerHTML=rows.filter(r=>r[1]!=null).map(([k,v])=>`<dl><dt>${k}</dt><dd>${v}</dd></dl>`).join("");}
  function selectBody(id){selected=id;focusParent=body(id).type==="planet"?id:body(id).parentBodyId;q("[data-ds-level]").textContent=id==="earth"?"Level 0 — Earth System":id==="neptune"?"Level 3 — Outer Solar System Context":focusParent?"Level 1 — Planetary System":"Level 2 — Solar System";renderAll();const entity=dataSource.entities.getById(`deep-space-${id}`);if(entity)viewer.flyTo(entity,{duration:.8,offset:new Cesium.HeadingPitchRange(0,-.35,Math.max(radiusFor(body(id))*8,60000))});}
  function setCamera(kind){const height=mode==="scientific"?6e9:6.5e6;viewer.camera.cancelFlight();viewer.camera.flyTo({destination:new Cesium.Cartesian3(0,0,height),orientation:{heading:0,pitch:kind==="top"?-Math.PI/2:-Math.PI/3,roll:0},duration:.7});}
  function resetView(){viewer.trackedEntity=undefined;follow=false;selected="sun";setCamera("inclined");renderInfo();}
  function onTick(){const now=performance.now();if(!lastTick)lastTick=now;const delta=Math.min(now-lastTick,250);lastTick=now;if(!paused){epoch=new Date(epoch.getTime()+delta*speed);updatePositions();}}
  function trapFocus(event){if(event.key==="Escape")return close();if(event.key!=="Tab")return;const items=[...overlay.querySelectorAll('button:not([disabled]),select,input')].filter(el=>el.offsetParent!==null);if(!items.length)return;const first=items[0],last=items.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}
  function open(){
    if(active||!viewer)return;active=true;sourceParent=host.parentNode;sourceNext=host.nextSibling;saved={globe:viewer.scene.globe.show,atmosphere:viewer.scene.skyAtmosphere.show,maxZoom:viewer.scene.screenSpaceCameraController.maximumZoomDistance,focus:document.activeElement};
    saved.layers=[...viewer.imageryLayers._layers].map((layer)=>[layer,layer.show]);overlay.hidden=false;document.body.classList.add("deep-space-open");viewport.append(host);viewer.scene.globe.show=false;viewer.scene.skyAtmosphere.show=false;saved.layers.forEach(([layer])=>layer.show=false);viewer.scene.screenSpaceCameraController.maximumZoomDistance=1e11;viewer.resize();
    dataSource=new Cesium.CustomDataSource("pcs-deep-space-phase-1");viewer.dataSources.add(dataSource);renderAll();resetView();lastTick=performance.now();tickRemover=viewer.clock.onTick.addEventListener(onTick);
    clickHandler=new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);clickHandler.setInputAction((movement)=>{const picked=viewer.scene.pick(movement.position),id=picked?.id?.properties?.deepSpaceBodyId?.getValue?.();if(id)selectBody(id);},Cesium.ScreenSpaceEventType.LEFT_CLICK);q("[data-ds-close]").focus();
  }
  function close(){
    if(!active)return;active=false;viewer.camera.cancelFlight();if(tickRemover){tickRemover();tickRemover=null;}if(clickHandler){clickHandler.destroy();clickHandler=null;}viewer.trackedEntity=undefined;if(dataSource){viewer.dataSources.remove(dataSource,true);dataSource=null;}
    if(sourceNext&&sourceNext.parentNode===sourceParent)sourceParent.insertBefore(host,sourceNext);else sourceParent.append(host);viewer.scene.globe.show=saved.globe;viewer.scene.skyAtmosphere.show=saved.atmosphere;saved.layers?.forEach(([layer,show])=>layer.show=show);viewer.scene.screenSpaceCameraController.maximumZoomDistance=saved.maxZoom;overlay.hidden=true;document.body.classList.remove("deep-space-open");viewer.resize();saved.focus?.focus?.();
  }
  function initialize(options){viewer=options.viewer;host=options.host;if(!overlay)setupOverlay();document.querySelector('[data-solar-target="deep-space"]')?.addEventListener("click",(event)=>{event.preventDefault();event.stopImmediatePropagation();open();},{capture:true});}
  const smallBodyProvider=Object.freeze({status:"unavailable",getObjects:()=>Promise.resolve([])}),cometEphemerisProvider=Object.freeze({status:"unavailable",getState:()=>null}),orbitUncertaintyProvider=Object.freeze({status:"unavailable",getUncertainty:()=>null});
  global.PCSDeepSpaceManager=Object.freeze({initialize,open,close,isOpen:()=>active,debug:()=>({viewerCount:document.querySelectorAll(".cesium-viewer").length,canvasCount:document.querySelectorAll("canvas").length,active,mode,epoch:epoch.toISOString(),tickListenerActive:Boolean(tickRemover),zoomEnabled:Boolean(viewer?.scene?.screenSpaceCameraController?.enableZoom),selected}),smallBodyProvider,cometEphemerisProvider,orbitUncertaintyProvider});
})(window);
