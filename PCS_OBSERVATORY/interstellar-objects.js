(function exposeInterstellarObjects(global) {
  "use strict";

  const Core = global.PCSSolarSystemCore;
  const dataset = global.PCSInterstellarObjectDataset;
  if (!Core || !dataset) return;

  const DAY_MS = 86400000;
  const COPY = Object.freeze({
    en: { layer:"Interstellar Objects", observed:"Observational-arc ephemeris", reconstructed:"Historical reconstructed path", derived:"Ephemeris-derived trajectory", perihelion:"Perihelion", incoming:"Incoming interstellar direction", outgoing:"Outgoing direction", jump:"Historical ephemeris reconstruction", fit:"Fit open trajectory" },
    "zh-TW": { layer:"星際天體", observed:"觀測弧星曆", reconstructed:"歷史重建路徑", derived:"星曆推導軌跡", perihelion:"近日點", incoming:"入射星際方向", outgoing:"離去方向", jump:"歷史星曆重建", fit:"框入開放軌跡" },
    ja: { layer:"恒星間天体", observed:"観測弧の暦軌道", reconstructed:"過去の再構成経路", derived:"暦から導出した軌道", perihelion:"近日点", incoming:"恒星間空間からの進入方向", outgoing:"離脱方向", jump:"過去の天体暦再構成", fit:"開いた軌道を全体表示" },
    ko: { layer:"성간 천체", observed:"관측호 천체력", reconstructed:"역사 재구성 경로", derived:"천체력 기반 궤적", perihelion:"근일점", incoming:"성간 유입 방향", outgoing:"이탈 방향", jump:"역사 천체력 재구성", fit:"열린 궤적 맞춤" }
  });
  const language = () => global.PCSI18n?.getLanguage?.() || "en";
  const copy = () => COPY[language()] || COPY.en;

  function jdTdb(epoch) {
    return Core.utcToJdTdb(Core.validDate(epoch));
  }

  function bracket(samples, jd) {
    if (!samples.length || jd < samples[0][0] || jd > samples.at(-1)[0]) return null;
    let low = 0, high = samples.length - 1;
    while (high - low > 1) {
      const middle = (low + high) >> 1;
      if (samples[middle][0] <= jd) low = middle;
      else high = middle;
    }
    return [samples[low], samples[high]];
  }

  function stateAt(record, epoch) {
    const date = Core.validDate(epoch);
    if (Core.timeConversionQuality(date).status !== "validated") return null;
    const jd = jdTdb(date), pair = bracket(record.samples, jd);
    if (!pair) return null;
    const [before, after] = pair, span = after[0] - before[0], t = span ? (jd - before[0]) / span : 0;
    const t2 = t * t, t3 = t2 * t;
    const h00 = 2*t3 - 3*t2 + 1, h10 = t3 - 2*t2 + t, h01 = -2*t3 + 3*t2, h11 = t3 - t2;
    const positionAu = [0,1,2].map(index => h00*before[index+1] + h10*span*before[index+4] + h01*after[index+1] + h11*span*after[index+4]);
    const velocityAuPerDay = [0,1,2].map(index => ((6*t2-6*t)/span)*before[index+1] + (3*t2-4*t+1)*before[index+4] + ((-6*t2+6*t)/span)*after[index+1] + (3*t2-2*t)*after[index+4]);
    return Object.freeze({
      bodyId:`interstellar:${record.id}`, epoch:date.toISOString(), jdTdb:jd, positionAu:Object.freeze(positionAu), velocityAuPerDay:Object.freeze(velocityAuPerDay),
      heliocentricDistanceAu:Math.hypot(...positionAu), dataStatus:"ephemeris-derived", source:"NASA/JPL Horizons API",
      catalogEphemeris:record.catalogEphemeris, coordinateFrame:record.referenceFrame, positionMode:"Cached Horizons vectors · cubic Hermite state",
      trajectoryStatus: jd < jdTdb(`${record.firstObservation}T00:00:00Z`) ? "historical-reconstructed" : jd <= jdTdb(`${record.lastObservation}T23:59:59Z`) ? "observational-arc-ephemeris" : "ephemeris-derived-outside-observation-arc",
      notice:"Numerically integrated Horizons trajectory. VECTORS supplies no time-varying covariance; the SBDB element uncertainties and observation arc are shown separately."
    });
  }

  function search(term) {
    const needle = String(term || "").trim().toLocaleLowerCase();
    if (!needle) return null;
    const names = record => [record.id, record.officialDesignation, record.permanentDesignation, record.provisionalDesignation, record.commonName, ...(record.aliases || [])].map(value => String(value || "").toLocaleLowerCase());
    return dataset.records.find(record => names(record).includes(needle)) || dataset.records.find(record => names(record).some(value => value.includes(needle))) || null;
  }

  function splitSamples(record) {
    const first = jdTdb(`${record.firstObservation}T00:00:00Z`), last = jdTdb(`${record.lastObservation}T23:59:59Z`), segments = { reconstructed:[], observed:[], derived:[] };
    for (const sample of record.samples) {
      const key = sample[0] < first ? "reconstructed" : sample[0] <= last ? "observed" : "derived";
      segments[key].push(sample);
    }
    const before = record.samples.filter(sample => sample[0] < first).at(-1), observedFirst = record.samples.find(sample => sample[0] >= first), observedLast = record.samples.filter(sample => sample[0] <= last).at(-1), after = record.samples.find(sample => sample[0] > last);
    if (before && observedFirst) segments.observed.unshift(before);
    if (observedLast && after) segments.derived.unshift(observedLast);
    return segments;
  }

  function sampleState(record, sample, status) {
    const positionAu = sample.slice(1,4);
    return { bodyId:`interstellar:${record.id}`, jdTdb:sample[0], positionAu, velocityAuPerDay:sample.slice(4,7), heliocentricDistanceAu:Math.hypot(...positionAu), trajectoryStatus:status };
  }

  function trajectoryStates(record) {
    return Object.freeze(record.samples.map(sample => Object.freeze(sampleState(record, sample, "ephemeris-derived"))));
  }

  class InterstellarLayer {
    constructor(viewer, dataSource, positionMapper) {
      this.viewer = viewer;
      this.dataSource = dataSource;
      this.positionMapper = positionMapper;
      this.visible = true;
      this.labels = true;
      this.epoch = new Date();
      this.entityIds = [];
    }
    removeEntities() {
      for (const id of this.entityIds) this.dataSource.entities.removeById(id);
      this.entityIds = [];
    }
    add(entity) {
      const result = this.dataSource.entities.add(entity);
      this.entityIds.push(result.id);
      return result;
    }
    pathMaterial(kind, color) {
      if (kind === "observed") return color.withAlpha(.96);
      return new Cesium.PolylineDashMaterialProperty({ color:color.withAlpha(kind === "reconstructed" ? .67 : .55), dashLength:kind === "reconstructed" ? 14 : 24 });
    }
    load(epoch, options={}) {
      this.removeEntities();
      this.visible = options.visible !== false;
      this.labels = options.labels !== false;
      this.epoch = Core.validDate(epoch);
      if (!this.visible) return this.debug();
      for (const record of dataset.records) {
        const color = Cesium.Color.fromCssColorString(record.color), segments = splitSamples(record);
        for (const [kind, samples] of Object.entries(segments)) {
          const positions = samples.map(sample => this.positionMapper(sampleState(record, sample, kind))).filter(Boolean);
          if (positions.length < 2) continue;
          const id = `interstellar-trajectory-${record.id}-${kind}`;
          this.add({ id, name:`${record.officialDesignation} — ${copy()[kind]}`, polyline:{ positions, width:kind === "observed" ? 3 : 2, arcType:Cesium.ArcType.NONE, material:this.pathMaterial(kind, color) }, properties:{ interstellarId:record.id, trajectorySegment:kind, closedOrbit:false, source:record.trajectorySource } });
        }
        const perihelionState = stateAt(record, record.perihelionEpochTdb.replace(" TDB", "Z"));
        if (perihelionState) this.add({ id:`interstellar-perihelion-${record.id}`, name:`${record.officialDesignation} ${copy().perihelion}`, position:this.positionMapper(perihelionState), point:{pixelSize:7,color:Cesium.Color.fromCssColorString("#ffe49a"),outlineColor:Cesium.Color.BLACK,outlineWidth:2}, label:{text:`${copy().perihelion} · ${record.elements.q.toFixed(3)} AU`,font:"12px system-ui",fillColor:Cesium.Color.fromCssColorString("#ffe49a"),outlineColor:Cesium.Color.BLACK,outlineWidth:3,style:Cesium.LabelStyle.FILL_AND_OUTLINE,pixelOffset:new Cesium.Cartesian2(0,-17),show:this.labels}, properties:{interstellarId:record.id,trajectoryMarker:"perihelion",source:record.trajectorySource} });
        this.addObject(record);
      }
      this.viewer.scene.requestRender();
      return this.debug();
    }
    addObject(record) {
      const state = stateAt(record, this.epoch), position = state && this.positionMapper(state), id = `interstellar-object-${record.id}`;
      if (!position) return null;
      const color = Cesium.Color.fromCssColorString(record.color);
      return this.add({ id, name:record.officialDesignation, position, point:{pixelSize:14,color,outlineColor:Cesium.Color.WHITE,outlineWidth:2}, label:{text:record.officialDesignation,font:"13px system-ui",fillColor:Cesium.Color.WHITE,outlineColor:Cesium.Color.BLACK,outlineWidth:3,style:Cesium.LabelStyle.FILL_AND_OUTLINE,pixelOffset:new Cesium.Cartesian2(0,-21),show:this.labels}, properties:{interstellarId:record.id,objectClass:record.objectClass,openTrajectory:true,source:record.trajectorySource,displayEpoch:state.epoch,trajectoryStatus:state.trajectoryStatus} });
    }
    updateEpoch(epoch) {
      this.epoch = Core.validDate(epoch);
      if (!this.visible) return;
      for (const record of dataset.records) {
        const entity = this.dataSource.entities.getById(`interstellar-object-${record.id}`), state = stateAt(record, this.epoch), position = state && this.positionMapper(state);
        if (entity) { entity.show = Boolean(position); if (position) entity.position = position; }
        else if (position) this.addObject(record);
      }
      this.viewer.scene.requestRender();
    }
    setLabels(show) {
      this.labels = Boolean(show);
      for (const id of this.entityIds) { const entity = this.dataSource.entities.getById(id); if (entity?.label) entity.label.show = this.labels; }
    }
    unload() { this.removeEntities(); }
    dispose() { this.unload(); this.viewer = null; this.dataSource = null; }
    debug() {
      const trajectoryIds = this.entityIds.filter(id => id.startsWith("interstellar-trajectory-"));
      const open = trajectoryIds.every(id => this.dataSource.entities.getById(id)?.properties?.closedOrbit?.getValue?.() === false);
      return Object.freeze({datasetId:dataset.datasetId,records:dataset.records.length,visible:this.visible,entities:this.entityIds.length,trajectorySegments:trajectoryIds.length,openTrajectories:open,epoch:this.epoch.toISOString(),classifications:dataset.records.map(record=>record.objectClass)});
    }
  }

  global.PCSInterstellarObjects = Object.freeze({ dataset, COPY, copy, stateAt, search, splitSamples, trajectoryStates, InterstellarLayer, DAY_MS });
})(window);
