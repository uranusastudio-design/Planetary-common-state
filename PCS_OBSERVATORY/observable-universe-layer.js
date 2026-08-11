(function exposeObservableUniverse(global) {
  "use strict";

  const Coordinates = global.PCSPhase4Coordinates;
  if (!Coordinates) return;

  const BASE = "./assets/deep-space/phase-4e/";
  const COLORS = Object.freeze({
    catalog: "#fff1a8",
    epoch: "#6ec8ff",
    reionization: "#bb8cff",
    lastScattering: "#ff9c6e",
    horizon: "#f3f7ff",
    guide: "#4d6685",
    selected: "#ffffff",
  });
  const clamp01 = (value) => Math.max(0, Math.min(1, value));
  const smoothstep = (start, end, value) => {
    const t = clamp01((value - start) / Math.max(end - start, 1e-9));
    return t * t * (3 - 2 * t);
  };
  const css = (name, alpha = 1) => Cesium.Color.fromCssColorString(COLORS[name]).withAlpha(alpha);
  const mappedRadius = (mpc, mode) => Coordinates.sceneRadiusMpc(mpc, mode, "observable-universe");
  const scenePosition = (xyz, mode) => new Cesium.Cartesian3(...Coordinates.scenePosition(xyz, mode, "observable-universe"));

  function attachContract(record) {
    return Object.assign(record, {
      sourceFrame: "Observer-centered ICRS/J2000 direction",
      sourceEpoch: "J2000 angular coordinates; cosmological radius has no positional epoch",
      distanceConvention: "Planck18 model-derived present-day line-of-sight comoving Mpc",
      redshiftConvention: record.redshift == null ? "Particle-horizon integral; no finite source redshift" : "Published or named cosmological redshift",
      cosmologyAssumption: "Astropy Planck18 realization; pcs-observable-universe-planck18-table-v1",
      transformVersion: "pcs-observable-universe-planck18-table-v1",
    });
  }

  class ObservableUniverseCatalog {
    constructor(base = BASE) {
      this.base = base;
      this.abort = null;
      this.bundle = null;
      this.context = null;
      this.epochMarkers = [];
      this.horizons = [];
      this.catalogLandmarks = [];
      this.byId = new Map();
    }

    async load() {
      if (this.bundle) return this.bundle;
      this.abort = new AbortController();
      const response = await fetch(`${this.base}observable-universe.json`, {
        signal: this.abort.signal,
        cache: "force-cache",
      });
      if (!response.ok) throw new Error(`Phase 4E catalog missing (${response.status})`);
      const bundle = await response.json();
      if (
        bundle.model.id !== "pcs-observable-universe-planck18-table-v1" ||
        bundle.epochMarkers.length !== 6 ||
        bundle.horizons.length !== 2 ||
        bundle.catalogLandmarks.length !== 2
      ) throw new Error("Phase 4E source contract mismatch");

      this.bundle = bundle;
      this.context = attachContract(Object.assign(bundle.context, {
        catalogIds: ["Planck18", "JADES sparse landmarks"],
        comovingMpc: bundle.horizons[1].comovingMpc,
        redshift: null,
        lookbackGyr: bundle.model.ageGyr,
        ageGyr: 0,
        observationStatus: "Sparse catalog landmarks only",
        reconstructionStatus: null,
        sourceCatalog: "Planck 2018 cosmological parameters / JADES literature landmarks",
        sourceRelease: "Planck Collaboration 2020; Carniani et al. 2024; Schouws et al. 2025",
        sourceDoi: bundle.model.doi,
      }));
      this.epochMarkers = bundle.epochMarkers.map((record) => attachContract(Object.assign(record, {
        aliases: record.aliases || [], catalogIds: [], observationStatus: null,
        reconstructionStatus: null, sourceCatalog: "Astropy Planck18 calculation table",
        sourceRelease: "PCS Phase 4E checksum-locked calculation snapshot", sourceDoi: bundle.model.doi,
      })));
      this.horizons = bundle.horizons.map((record) => attachContract(Object.assign(record, {
        aliases: record.aliases || [], catalogIds: [], observationStatus: null,
        reconstructionStatus: null, sourceCatalog: "Planck18 model context",
        sourceRelease: "PCS Phase 4E checksum-locked calculation snapshot", sourceDoi: bundle.model.doi,
      })));
      this.catalogLandmarks = bundle.catalogLandmarks.map((record) => attachContract(Object.assign(record, {
        reconstructionStatus: null, sourceCatalog: "JADES / JWST NIRSpec / ALMA literature landmark",
        sourceRelease: "Carniani et al. 2024; Schouws et al. 2025",
      })));
      this.byId = new Map([this.context, ...this.epochMarkers, ...this.horizons, ...this.catalogLandmarks]
        .map((record) => [record.id, record]));
      return bundle;
    }

    get(id) { return this.byId.get(id) || null; }

    search(term) {
      const needle = String(term || "").trim().toLowerCase();
      if (!needle) return null;
      const records = [this.context, ...this.catalogLandmarks, ...this.horizons, ...this.epochMarkers];
      const values = (record) => [record.canonicalName, ...(record.aliases || []), ...(record.catalogIds || [])]
        .map((value) => String(value).toLowerCase());
      return records.find((record) => values(record).some((value) => value === needle))
        || records.find((record) => values(record).some((value) => value.includes(needle)))
        || null;
    }

    unload() {
      this.abort?.abort();
      this.abort = null;
      this.bundle = null;
      this.context = null;
      this.epochMarkers = [];
      this.horizons = [];
      this.catalogLandmarks = [];
      this.byId = new Map();
    }
  }

  function ringPositions(radius, plane, segments = 128) {
    const points = [];
    for (let index = 0; index <= segments; index += 1) {
      const angle = index / segments * Math.PI * 2;
      const a = Math.cos(angle) * radius;
      const b = Math.sin(angle) * radius;
      points.push(plane === "xy" ? new Cesium.Cartesian3(a, b, 0)
        : plane === "xz" ? new Cesium.Cartesian3(a, 0, b)
          : new Cesium.Cartesian3(0, a, b));
    }
    return points;
  }

  class ObservableUniverseLayer {
    constructor(viewer) {
      this.viewer = viewer;
      this.mode = "exhibition";
      this.collections = { shells: null, guides: null, landmarks: null, labels: null };
      this.flags = { epochs: true, horizons: true, catalog: true, guides: true };
      this.shellEntries = [];
      this.landmarkEntries = [];
      this.scenePositions = new Map();
      this.selectedId = null;
      this.cameraRemover = null;
      this.previousCameraPercentageChanged = null;
      this.lodBlend = { innerSurvey: 1, epochs: 0.7, horizons: 1, catalog: 0.9 };
      this.outerRadius = 0;
    }

    addShell(record, kind, radius, colorName, baseAlpha, width) {
      const material = () => Cesium.Material.fromType("Color", { color: css(colorName, baseAlpha) });
      const lines = ["xy", "xz", "yz"].map((plane) => this.collections.shells.add({
        positions: ringPositions(radius, plane), width, material: material(),
        id: { phase4Object: record, phase4eShell: kind },
      }));
      const position = new Cesium.Cartesian3(radius, 0, 0);
      this.scenePositions.set(record.id, position);
      const label = this.collections.labels.add({
        position,
        text: record.redshift == null ? `${record.canonicalName} · ${Math.round(record.comovingMpc).toLocaleString()} Mpc`
          : `${record.canonicalName} · z ${record.redshift}`,
        font: "12px system-ui", fillColor: css(colorName, 0.96), outlineColor: Cesium.Color.BLACK,
        outlineWidth: 3, style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new Cesium.Cartesian2(8, -5), showBackground: true,
        backgroundColor: Cesium.Color.BLACK.withAlpha(0.58),
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, this.outerRadius * 3.2),
        id: { phase4Object: record, phase4eLabel: kind },
      });
      this.shellEntries.push({ record, kind, colorName, baseAlpha, width, lines, label });
    }

    load(catalog, mode = "exhibition") {
      this.unload();
      this.mode = mode;
      this.outerRadius = mappedRadius(catalog.horizons.at(-1).comovingMpc, mode);
      this.collections.shells = this.viewer.scene.primitives.add(new Cesium.PolylineCollection());
      this.collections.guides = this.viewer.scene.primitives.add(new Cesium.PolylineCollection());
      this.collections.landmarks = this.viewer.scene.primitives.add(new Cesium.PointPrimitiveCollection());
      this.collections.labels = this.viewer.scene.primitives.add(new Cesium.LabelCollection());

      for (const record of catalog.epochMarkers) {
        const colorName = record.redshift === 6 ? "reionization" : "epoch";
        this.addShell(record, "epoch", mappedRadius(record.comovingMpc, mode), colorName, 0.26, 1);
      }
      for (const record of catalog.horizons) {
        const lastScattering = record.id.endsWith("last-scattering");
        this.addShell(record, "horizon", mappedRadius(record.comovingMpc, mode), lastScattering ? "lastScattering" : "horizon", lastScattering ? 0.58 : 0.82, lastScattering ? 2 : 2.5);
      }
      for (const record of catalog.catalogLandmarks) {
        const position = scenePosition(record.positionIcrsComovingMpc, mode);
        const primitive = this.collections.landmarks.add({
          position, pixelSize: 10, color: css("catalog", 0.98), outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2, scaleByDistance: new Cesium.NearFarScalar(0, 1.5, this.outerRadius * 2.5, 0.72),
          translucencyByDistance: new Cesium.NearFarScalar(0, 1, this.outerRadius * 3, 0.7),
          id: { phase4Object: record, phase4Observation: "catalog-landmark" },
        });
        this.scenePositions.set(record.id, position);
        this.landmarkEntries.push({ record, primitive });
      }

      const guideMaterial = Cesium.Material.fromType("Color", { color: css("guide", 0.34) });
      for (const axis of [Cesium.Cartesian3.UNIT_X, Cesium.Cartesian3.UNIT_Y, Cesium.Cartesian3.UNIT_Z]) {
        const endpoint = Cesium.Cartesian3.multiplyByScalar(axis, this.outerRadius, new Cesium.Cartesian3());
        this.collections.guides.add({ positions: [Cesium.Cartesian3.ZERO, endpoint], width: 1, material: guideMaterial });
      }
      this.scenePositions.set(catalog.context.id, Cesium.Cartesian3.ZERO);
      this.previousCameraPercentageChanged = this.viewer.camera.percentageChanged;
      this.viewer.camera.percentageChanged = Math.min(this.previousCameraPercentageChanged ?? 0.5, 0.01);
      this.cameraRemover = this.viewer.camera.changed.addEventListener(() => this.updateLod());
      this.updateVisibility();
      this.updateLod();
      return this;
    }

    updateLod() {
      if (!this.outerRadius) return;
      const ratio = Cesium.Cartesian3.magnitude(this.viewer.camera.positionWC) / this.outerRadius;
      const far = smoothstep(0.28, 0.9, ratio);
      this.lodBlend = {
        innerSurvey: 1 - smoothstep(0.22, 0.82, ratio),
        epochs: 0.28 + far * 0.72,
        horizons: 0.42 + far * 0.58,
        catalog: 1 - smoothstep(0.65, 1.5, ratio) * 0.35,
      };
      for (const entry of this.shellEntries) {
        const blend = entry.kind === "horizon" ? this.lodBlend.horizons : this.lodBlend.epochs;
        const selected = entry.record.id === this.selectedId;
        for (const line of entry.lines) {
          line.material.uniforms.color = selected ? css("selected", 1) : css(entry.colorName, entry.baseAlpha * blend);
          line.width = selected ? Math.max(3, entry.width + 1.5) : entry.width;
        }
        entry.label.fillColor = selected ? css("selected", 1) : css(entry.colorName, 0.96 * blend);
      }
      for (const entry of this.landmarkEntries) {
        const selected = entry.record.id === this.selectedId;
        entry.primitive.pixelSize = selected ? 17 : 10;
        entry.primitive.color = selected ? css("selected", 1) : css("catalog", this.lodBlend.catalog);
      }
      this.viewer.scene.requestRender();
    }

    updateVisibility() {
      if (this.collections.shells) {
        for (const entry of this.shellEntries) {
          const show = entry.kind === "horizon" ? this.flags.horizons : this.flags.epochs;
          entry.lines.forEach((line) => { line.show = show; });
          entry.label.show = show;
        }
      }
      if (this.collections.landmarks) this.collections.landmarks.show = this.flags.catalog;
      if (this.collections.guides) this.collections.guides.show = this.flags.guides;
      this.viewer.scene.requestRender();
    }

    setLayer(name, visible) {
      if (!(name in this.flags)) return false;
      this.flags[name] = Boolean(visible);
      this.updateVisibility();
      return this.flags[name];
    }

    select(record) {
      this.selectedId = record?.id || null;
      this.updateLod();
      return this.selectedId;
    }

    positionFor(record) { return record ? this.scenePositions.get(record.id) || null : null; }

    unload() {
      this.cameraRemover?.();
      this.cameraRemover = null;
      if (this.previousCameraPercentageChanged != null) this.viewer.camera.percentageChanged = this.previousCameraPercentageChanged;
      this.previousCameraPercentageChanged = null;
      for (const collection of Object.values(this.collections)) {
        if (collection && !collection.isDestroyed?.()) this.viewer.scene.primitives.remove(collection);
      }
      this.collections = { shells: null, guides: null, landmarks: null, labels: null };
      this.shellEntries = [];
      this.landmarkEntries = [];
      this.scenePositions = new Map();
      this.selectedId = null;
      this.outerRadius = 0;
      this.lodBlend = { innerSurvey: 1, epochs: 0.7, horizons: 1, catalog: 0.9 };
    }

    dispose() { this.unload(); }

    debug() {
      return {
        loaded: Boolean(this.collections.shells),
        epochMarkers: this.shellEntries.filter((entry) => entry.kind === "epoch").length,
        horizons: this.shellEntries.filter((entry) => entry.kind === "horizon").length,
        shellPolylines: this.shellEntries.reduce((sum, entry) => sum + entry.lines.length, 0),
        catalogLandmarks: this.landmarkEntries.length,
        flags: { ...this.flags },
        selectedId: this.selectedId,
        listenerActive: Boolean(this.cameraRemover),
        lodBlend: { ...this.lodBlend },
        transformVersion: "pcs-observable-universe-planck18-table-v1",
        allSkyFill: false,
        cmbMapLoaded: false,
      };
    }
  }

  global.PCSObservableUniverse = Object.freeze({ ObservableUniverseCatalog, ObservableUniverseLayer, COLORS });
})(typeof window === "undefined" ? globalThis : window);
