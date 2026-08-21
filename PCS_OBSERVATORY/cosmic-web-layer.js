(function exposeCosmicWeb(global) {
  "use strict";

  const Coordinates = global.PCSPhase4Coordinates;
  if (!Coordinates) return;

  const BASE = "./assets/deep-space/phase-4d/";
  const COLORS = Object.freeze({
    galaxy: "#a8d8ff",
    group: "#ffd36d",
    density: "#6679ff",
    filament: "#63e7d8",
    void: "#d19cff",
    selected: "#ffffff",
  });
  const WALL_STATUS = "Unavailable — no separately validated wall geometry is deployed";
  const clamp01 = (value) => Math.max(0, Math.min(1, value));
  const smoothstep = (start, end, value) => {
    const t = clamp01((value - start) / Math.max(end - start, 1));
    return t * t * (3 - 2 * t);
  };
  const scenePosition = (xyz, mode) => new Cesium.Cartesian3(...Coordinates.scenePosition(xyz, mode, "cosmic-web"));
  const color = (name, alpha) => Cesium.Color.fromCssColorString(COLORS[name]).withAlpha(alpha);

  function common(record, sourceId, doi) {
    return Object.assign(record, {
      sourceFrame: "Observer-centered ICRS Cartesian",
      sourceEpoch: "J2000",
      distanceConvention: "Source-native comoving Mpc/h; see per-source cosmology",
      redshiftConvention: "Source redshift convention retained",
      cosmologyAssumption: sourceId === "vizier-j-apj-835-161"
        ? "flat Lambda-CDM, Omega-m=0.3"
        : "Omega-m=0.27, Omega-Lambda=0.73, H0=100h km/s/Mpc",
      transformVersion: "pcs-sdss-survey-to-icrs-v1",
      sourceId,
      sourceDoi: doi,
    });
  }

  class CosmicWebCatalog {
    constructor(base = BASE) {
      this.base = base;
      this.abort = null;
      this.bundle = null;
      this.context = null;
      this.galaxies = [];
      this.groups = [];
      this.densityCells = [];
      this.filaments = [];
      this.voids = [];
      this.byId = new Map();
    }

    async load() {
      if (this.bundle) return this.bundle;
      this.abort = new AbortController();
      const response = await fetch(`${this.base}cosmic-web.json`, {
        signal: this.abort.signal,
        cache: "force-cache",
      });
      if (!response.ok) throw new Error(`Phase 4D catalog missing (${response.status})`);
      const bundle = await response.json();
      if (
        bundle.sourceCounts.sdssGalaxies !== 576493 ||
        bundle.deployedCounts.galaxyLodSample !== 48041 ||
        bundle.deployedCounts.filaments !== 2306 ||
        bundle.deployedCounts.voids !== 1228
      ) throw new Error("Phase 4D catalog count mismatch");

      this.bundle = bundle;
      this.context = common({
        id: "pcs:survey-region:cosmic-web-context",
        canonicalName: "Cosmic Web Survey Context",
        aliases: ["Cosmic Web", "Large-scale structure", "Survey-scale cosmic web"],
        objectType: "Survey Region",
        catalogIds: ["SDSS DR8", "BOSS DR12"],
        positionIcrsComovingHinvMpc: null,
        distanceType: "Multiple source-native comoving distance contracts",
        observationStatus: null,
        reconstructionStatus: "Mixed catalog observations and explicitly styled reconstructions",
        dataStatus: "Multi-survey observational context",
        visualizationStatus: "No artificial all-sky fill; wall geometry unavailable",
        memberCount: bundle.sourceCounts.sdssGalaxies,
        sourceCatalog: "SDSS DR8 / BOSS DR12",
        sourceRelease: "Tempel 2012/2014; Mao et al. 2017",
        knownLimitations: [bundle.coverage.sdss, bundle.coverage.boss, bundle.coverage.walls],
      }, "vizier-j-mnras-438-3465", "10.1093/mnras/stt2456");

      this.galaxies = bundle.galaxies.map((row) => common({
        id: `pcs:sdss-dr8-galaxy:${row[0]}`,
        canonicalName: `SDSS DR8 Galaxy ${row[0]}`,
        aliases: [`Tempel DR8 Galaxy ${row[0]}`],
        objectType: "Galaxy",
        catalogIds: [`J/MNRAS/438/3465 galaxy ${row[0]}`],
        groupRichness: row[1], redshift: row[2], raDeg: row[3], decDeg: row[4],
        comovingDistanceHinvMpc: row[5], rMagnitude: row[6],
        distanceToNearestFilamentHinvMpc: row[7], nearestFilamentId: row[8],
        positionIcrsComovingHinvMpc: row[9],
        observationStatus: "Catalog Observation",
        reconstructionStatus: null,
        dataStatus: "Catalog Observation — deterministic one-in-twelve runtime LOD sample",
        visualizationStatus: "Catalog point",
        sourceCatalog: "SDSS DR8 filament galaxy table",
        sourceRelease: "Tempel et al. 2014",
      }, "vizier-j-mnras-438-3465", "10.1093/mnras/stt2456"));

      this.groups = bundle.groups.map((row) => common({
        id: `pcs:sdss-dr8-group:${row[0]}`,
        canonicalName: `SDSS DR8 Group ${row[0]}`,
        aliases: [`Tempel DR8 Group ${row[0]}`],
        objectType: row[1] >= 30 ? "Galaxy Cluster" : "Galaxy Group",
        catalogIds: [`J/A+A/540/A106 group ${row[0]}`],
        richness: row[1], redshift: row[2], comovingDistanceHinvMpc: row[3],
        raDeg: row[4], decDeg: row[5], sizeHinvMpc: row[6], virialRadiusHinvMpc: row[7],
        velocityDispersionKmS: row[8], density8: row[9], distanceToMaskHinvMpc: row[10],
        positionIcrsComovingHinvMpc: row[11],
        observationStatus: "Catalog-derived member positions and redshifts",
        reconstructionStatus: null,
        dataStatus: "Derived Measurement — friends-of-friends group catalog",
        visualizationStatus: "Derived group/cluster-center marker",
        sourceCatalog: "SDSS DR8 groups and clusters",
        sourceRelease: "Tempel et al. 2012",
      }, "vizier-j-aa-540-a106", "10.1051/0004-6361/201118687"));

      this.densityCells = bundle.densityCells.map((row) => common({
        id: `pcs:density-cell:sdss-dr8:${row[0]}`,
        canonicalName: `SDSS Density Cell ${row[0]}`,
        aliases: [], objectType: "Survey Region", catalogIds: [],
        galaxyCount: row[1], voxelSizeHinvMpc: 20, positionIcrsComovingHinvMpc: row[2],
        observationStatus: null, reconstructionStatus: null,
        dataStatus: "Derived Measurement",
        visualizationStatus: "20 Mpc/h Cartesian count aggregation; not a directly observed object",
        sourceCatalog: "PCS aggregation of Tempel et al. 2014 galaxy table",
        sourceRelease: "PCS Phase 4D deterministic aggregation",
      }, "vizier-j-mnras-438-3465", "10.1093/mnras/stt2456"));

      this.filaments = bundle.filaments.map((row) => common({
        id: `pcs:filament:tempel2014:${row[0]}`,
        canonicalName: `SDSS Filament ${row[0]}`,
        aliases: [`Tempel Filament ${row[0]}`], objectType: "Filament",
        catalogIds: [`J/MNRAS/438/3465 filament ${row[0]}`],
        pointCount: row[1], lengthHinvMpc: row[2], galaxiesWithin05: row[3], galaxiesWithin1: row[4],
        positionsIcrsComovingHinvMpc: row[5],
        positionIcrsComovingHinvMpc: row[5][Math.floor(row[5].length / 2)],
        observationStatus: null,
        reconstructionStatus: "Observation-based Reconstruction",
        dataStatus: "Observation-based Reconstruction",
        visualizationStatus: "Published Bisous-model filament spine",
        sourceCatalog: "SDSS DR8 Bisous filament catalog",
        sourceRelease: "Tempel et al. 2014",
      }, "vizier-j-mnras-438-3465", "10.1093/mnras/stt2456"));

      this.voids = bundle.voids.map((row) => common({
        id: `pcs:void:boss-dr12:${String(row[0]).toLowerCase()}:${row[1]}`,
        canonicalName: `BOSS ${row[0]} Void ${row[1]}`,
        aliases: [`${row[0]} Void ${row[1]}`], objectType: "Void",
        catalogIds: [`J/ApJ/835/161 ${row[0]} ${row[1]}`],
        sample: row[0], raDeg: row[2], decDeg: row[3], redshift: row[4],
        memberGalaxyCount: row[5], volumeHinvMpc3: row[6], effectiveRadiusHinvMpc: row[7],
        minimumDensityH3Mpc3: row[8], minimumDensityContrast: row[9], poissonProbability: row[10],
        distanceToBoundaryHinvMpc: row[11], comovingDistanceHinvMpc: row[12],
        positionIcrsComovingHinvMpc: row[13], observationStatus: null,
        reconstructionStatus: "Observation-based Reconstruction",
        dataStatus: "Observation-based Reconstruction — ZOBOV void catalog",
        visualizationStatus: "Effective-radius ring marker; not the physical void boundary",
        sourceCatalog: "BOSS DR12 ZOBOV void catalog", sourceRelease: "Mao et al. 2017",
      }, "vizier-j-apj-835-161", "10.3847/1538-4357/835/2/161"));

      this.byId = new Map([
        [this.context.id, this.context],
        ...[...this.galaxies, ...this.groups, ...this.densityCells, ...this.filaments, ...this.voids]
          .map((record) => [record.id, record]),
      ]);
      return bundle;
    }

    get(id) { return this.byId.get(id) || null; }

    search(term) {
      const needle = String(term || "").trim().toLowerCase();
      if (!needle) return null;
      const sets = [[this.context], this.groups, this.filaments, this.voids, this.galaxies];
      const values = (record) => [record.canonicalName, ...(record.aliases || []), ...(record.catalogIds || [])]
        .map((value) => String(value).toLowerCase());
      for (const records of sets) {
        const exact = records.find((record) => values(record).some((value) => value === needle));
        if (exact) return exact;
      }
      for (const records of sets) {
        const partial = records.find((record) => values(record).some((value) => value.includes(needle)));
        if (partial) return partial;
      }
      return null;
    }

    unload() {
      this.abort?.abort();
      this.abort = null;
      this.bundle = null;
      this.context = null;
      this.galaxies = [];
      this.groups = [];
      this.densityCells = [];
      this.filaments = [];
      this.voids = [];
      this.byId = new Map();
    }
  }

  class CosmicWebLayer {
    constructor(viewer) {
      this.viewer = viewer;
      this.mode = "exhibition";
      this.collections = { density: null, galaxies: null, groups: null, filaments: null, voids: null };
      this.flags = { density: true, galaxies: true, groups: true, filaments: true, walls: false, voids: true };
      this.lod = "survey";
      this.lodRange = null;
      this.lodBlend = { galaxies: 0, groups: 0.45, density: 1, filaments: 0.65, voids: 1 };
      this.selectedId = null;
      this.lookup = new Map();
      this.scenePositions = new Map();
      this.filamentEntries = [];
      this.cameraRemover = null;
      this.cameraMoveEndRemover = null;
      this.previousCameraPercentageChanged = null;
      this.lodMetrics = { hotPathUpdates: 0, visualUpdates: 0, hotPathTotalMs: 0, visualTotalMs: 0, maximumMs: 0 };
    }

    load(catalog, mode = "exhibition") {
      this.unload();
      this.mode = mode;
      const nearRange = Coordinates.sceneRadiusMpc(95, mode, "cosmic-web");
      const farRange = Coordinates.sceneRadiusMpc(760, mode, "cosmic-web");
      const collections = this.collections;
      collections.density = this.viewer.scene.primitives.add(new Cesium.PointPrimitiveCollection());
      collections.galaxies = this.viewer.scene.primitives.add(new Cesium.PointPrimitiveCollection());
      collections.groups = this.viewer.scene.primitives.add(new Cesium.PointPrimitiveCollection());
      collections.filaments = this.viewer.scene.primitives.add(new Cesium.PolylineCollection());
      collections.voids = this.viewer.scene.primitives.add(new Cesium.BillboardCollection());

      for (const record of catalog.densityCells) {
        const position = scenePosition(record.positionIcrsComovingHinvMpc, mode);
        const basePixelSize = Math.min(12, 2 + Math.log2(record.galaxyCount + 1));
        const primitive = collections.density.add({
          position, pixelSize: basePixelSize, color: color("density", 0.76),
          translucencyByDistance: new Cesium.NearFarScalar(0, 0.025, farRange * 1.8, 0.76),
          scaleByDistance: new Cesium.NearFarScalar(0, 0.45, farRange * 1.8, 1.2),
          id: { phase4Object: record, phase4Derived: "density-cell" },
        });
        this.remember(record, primitive, position, { kind: "density", basePixelSize, baseColor: color("density", 0.76) });
      }

      for (const record of catalog.galaxies) {
        const position = scenePosition(record.positionIcrsComovingHinvMpc, mode);
        const basePixelSize = 2.2;
        const primitive = collections.galaxies.add({
          position, pixelSize: basePixelSize, color: color("galaxy", 0.92),
          translucencyByDistance: new Cesium.NearFarScalar(0, 0.95, farRange, 0.02),
          scaleByDistance: new Cesium.NearFarScalar(0, 1.15, farRange, 0.55),
          id: { phase4Object: record, phase4Observation: "catalog-point" },
        });
        this.remember(record, primitive, position, { kind: "galaxy", basePixelSize, baseColor: color("galaxy", 0.92) });
      }

      for (const record of catalog.groups) {
        const position = scenePosition(record.positionIcrsComovingHinvMpc, mode);
        const basePixelSize = Math.min(11, 4 + Math.log2(record.richness));
        const primitive = collections.groups.add({
          position, pixelSize: basePixelSize, color: color("group", 0.94),
          outlineColor: Cesium.Color.BLACK, outlineWidth: 1,
          translucencyByDistance: new Cesium.NearFarScalar(0, 0.42, farRange * 1.8, 0.86),
          scaleByDistance: new Cesium.NearFarScalar(0, 0.75, farRange * 1.8, 1.25),
          id: { phase4Object: record, phase4Derived: "friends-of-friends-group" },
        });
        this.remember(record, primitive, position, { kind: "group", basePixelSize, baseColor: color("group", 0.94) });
      }

      for (const record of catalog.filaments) {
        const positions = record.positionsIcrsComovingHinvMpc.map((xyz) => scenePosition(xyz, mode));
        const baseWidth = 1.15;
        const primitive = collections.filaments.add({
          positions, width: baseWidth,
          material: Cesium.Material.fromType("Color", { color: color("filament", 0.45) }),
          id: { phase4Object: record, phase4Reconstruction: "bisous-filament" },
        });
        const midpoint = scenePosition(record.positionIcrsComovingHinvMpc, mode);
        const entry = { primitive, record, position: midpoint, kind: "filament", baseWidth, baseAlpha: 0.45 };
        this.lookup.set(record.id, entry);
        this.scenePositions.set(record.id, midpoint);
        this.filamentEntries.push(entry);
      }

      const ring = `data:image/svg+xml;charset=utf-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><circle cx="32" cy="32" r="25" fill="none" stroke="#d19cff" stroke-width="5" stroke-dasharray="7 5"/></svg>')}`;
      for (const record of catalog.voids) {
        const position = scenePosition(record.positionIcrsComovingHinvMpc, mode);
        const baseSize = Math.min(30, 12 + Math.log2(record.effectiveRadiusHinvMpc));
        const primitive = collections.voids.add({
          position, image: ring, width: baseSize, height: baseSize,
          color: Cesium.Color.WHITE.withAlpha(0.8),
          translucencyByDistance: new Cesium.NearFarScalar(nearRange * 0.55, 0.02, farRange * 2.2, 0.9),
          scaleByDistance: new Cesium.NearFarScalar(nearRange * 0.55, 0.55, farRange * 2.2, 1.35),
          id: { phase4Object: record, phase4Reconstruction: "zobov-void-effective-radius" },
        });
        this.remember(record, primitive, position, { kind: "void", baseScale: 1, baseColor: Cesium.Color.WHITE.withAlpha(0.8) });
      }

      this.previousCameraPercentageChanged = this.viewer.camera.percentageChanged;
      this.viewer.camera.percentageChanged = Math.min(0.01, this.viewer.camera.percentageChanged);
      this.cameraRemover = this.viewer.camera.changed.addEventListener(() => this.updateLod(false));
      this.cameraMoveEndRemover = this.viewer.camera.moveEnd.addEventListener(() => this.updateLod(true));
      this.applyFlags();
      this.updateLod(true);
      this.viewer.scene.requestRender();
      return this.debug();
    }

    remember(record, primitive, position, style) {
      this.lookup.set(record.id, { primitive, record, position, ...style });
      this.scenePositions.set(record.id, position);
    }

    currentRange() {
      if (!this.viewer) return 0;
      const target = this.scenePositions.get(this.selectedId) || Cesium.Cartesian3.ZERO;
      return Cesium.Cartesian3.distance(this.viewer.camera.positionWC, target);
    }

    updateLod(applyVisual = false) {
      if (!this.viewer) return;
      const started = performance.now();
      const near = Coordinates.sceneRadiusMpc(95, this.mode, "cosmic-web");
      const far = Coordinates.sceneRadiusMpc(760, this.mode, "cosmic-web");
      const range = this.currentRange();
      const mediumMix = smoothstep(near * 0.72, near * 1.22, range);
      const surveyMix = smoothstep(far * 0.78, far * 1.18, range);
      this.lod = range < near ? "individual-galaxies" : range < far ? "groups-clusters" : "survey";
      this.lodRange = range;
      this.lodBlend = {
        galaxies: 1 - mediumMix,
        groups: (0.35 + 0.65 * mediumMix) * (1 - 0.5 * surveyMix),
        density: mediumMix * (0.4 + 0.6 * surveyMix),
        filaments: 0.1 + 0.9 * mediumMix * (1 - 0.32 * surveyMix),
        voids: mediumMix * (0.2 + 0.8 * surveyMix),
      };
      if (applyVisual) {
        for (const entry of this.filamentEntries) {
          const selected = entry.record.id === this.selectedId;
          entry.primitive.material.uniforms.color = selected
            ? Cesium.Color.WHITE.withAlpha(1)
            : color("filament", Math.max(0.035, 0.56 * this.lodBlend.filaments));
        }
        this.applyFlags();
        this.viewer.scene.requestRender();
      }
      const duration = performance.now() - started;
      if (applyVisual) { this.lodMetrics.visualUpdates += 1; this.lodMetrics.visualTotalMs += duration; }
      else { this.lodMetrics.hotPathUpdates += 1; this.lodMetrics.hotPathTotalMs += duration; }
      this.lodMetrics.maximumMs = Math.max(this.lodMetrics.maximumMs, duration);
    }

    applyFlags() {
      for (const name of ["density", "galaxies", "groups", "filaments", "voids"]) {
        if (this.collections[name]) this.collections[name].show = this.flags[name];
      }
    }

    setLayer(name, value) {
      if (name === "walls") return false;
      if (name in this.flags) {
        this.flags[name] = Boolean(value);
        this.applyFlags();
        this.viewer.scene.requestRender();
        return true;
      }
      return false;
    }

    select(record) {
      const previous = this.lookup.get(this.selectedId);
      if (previous) this.restore(previous);
      this.selectedId = record?.id || null;
      const current = this.lookup.get(this.selectedId);
      if (current) {
        if ("pixelSize" in current.primitive) {
          current.primitive.pixelSize = Math.max(13, current.basePixelSize * 1.8);
          current.primitive.color = Cesium.Color.WHITE;
        } else if (current.kind === "filament") {
          current.primitive.width = 4;
          current.primitive.material.uniforms.color = Cesium.Color.WHITE;
        } else if ("scale" in current.primitive) {
          current.primitive.scale = 1.7;
          current.primitive.color = Cesium.Color.WHITE;
        }
      }
      this.updateLod();
      return record;
    }

    restore(entry) {
      if ("pixelSize" in entry.primitive) {
        entry.primitive.pixelSize = entry.basePixelSize;
        entry.primitive.color = entry.baseColor;
      } else if (entry.kind === "filament") {
        entry.primitive.width = entry.baseWidth;
      } else if ("scale" in entry.primitive) {
        entry.primitive.scale = entry.baseScale;
        entry.primitive.color = entry.baseColor;
      }
    }

    unload() {
      this.cameraRemover?.();
      this.cameraRemover = null;
      this.cameraMoveEndRemover?.();
      this.cameraMoveEndRemover = null;
      if (this.previousCameraPercentageChanged != null && this.viewer) {
        this.viewer.camera.percentageChanged = this.previousCameraPercentageChanged;
      }
      this.previousCameraPercentageChanged = null;
      for (const key of Object.keys(this.collections)) {
        const collection = this.collections[key];
        if (collection) this.viewer.scene.primitives.remove(collection);
        this.collections[key] = null;
      }
      this.lookup.clear();
      this.scenePositions.clear();
      this.filamentEntries = [];
      this.selectedId = null;
      this.lodRange = null;
    }

    dispose() {
      this.unload();
      this.viewer = null;
    }

    debug() {
      return {
        density: this.collections.density?.length || 0,
        galaxies: this.collections.galaxies?.length || 0,
        groups: this.collections.groups?.length || 0,
        filaments: this.collections.filaments?.length || 0,
        walls: 0,
        wallStatus: WALL_STATUS,
        voids: this.collections.voids?.length || 0,
        lod: this.lod,
        lodRange: this.lodRange,
        lodBlend: { ...this.lodBlend },
        selectedId: this.selectedId,
        flags: { ...this.flags },
        cameraListener: Boolean(this.cameraRemover),
        cameraMoveEndListener: Boolean(this.cameraMoveEndRemover),
        lodMetrics: { ...this.lodMetrics },
        cameraPercentageChanged: this.viewer?.camera?.percentageChanged ?? null,
      };
    }
  }

  global.PCSCosmicWeb = Object.freeze({
    BASE, COLORS, WALL_STATUS, clamp01, smoothstep, scenePosition, CosmicWebCatalog, CosmicWebLayer,
  });
})(window);
