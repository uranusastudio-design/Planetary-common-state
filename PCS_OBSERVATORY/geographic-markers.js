(function exposePcsGeographicMarkers(global) {
  "use strict";

  const markerRegistry = new Map();
  let debugEnabled = false;
  const HORIZON_SAFETY_THRESHOLD = 0.03;
  const MARKER_VISUAL_OFFSETS_METERS = Object.freeze({
    earthquake: 5000,
    fire: 4000,
    cyclone: 8000,
    coastalStation: 2500,
    weatherStation: 2500,
    scienceStation: 2500,
    visitor: 3500,
    userLocation: 4000,
    regionalObservation: 3500,
    alert: 6000,
    default: 3000,
  });

  function normalizeCoordinates(input, options = {}) {
    let longitude;
    let latitude;
    let observedAltitudeMeters;
    let visualOffsetMeters;

    if (Array.isArray(input)) {
      if (options.coordinateOrder !== "geojson") {
        throw new TypeError("Array coordinates require coordinateOrder: geojson ([longitude, latitude, height]).");
      }
      [longitude, latitude, observedAltitudeMeters] = input;
    } else {
      longitude = input?.longitude ?? input?.lon ?? input?.lng;
      latitude = input?.latitude ?? input?.lat;
      observedAltitudeMeters = input?.observedAltitudeMeters
        ?? input?.observed_altitude_m
        ?? input?.altitude_m
        ?? input?.altitude
        ?? input?.height;
      visualOffsetMeters = input?.visualOffsetMeters ?? input?.visual_offset_m;
    }

    const observed = observedAltitudeMeters === null || observedAltitudeMeters === undefined || observedAltitudeMeters === ""
      ? Number(options.defaultObservedAltitudeMeters ?? options.defaultHeight ?? 0)
      : Number(observedAltitudeMeters);
    const visualOffset = visualOffsetMeters === null || visualOffsetMeters === undefined || visualOffsetMeters === ""
      ? Number(options.visualOffsetMeters ?? 0)
      : Number(visualOffsetMeters);

    return {
      longitude: Number(longitude),
      latitude: Number(latitude),
      observedAltitudeMeters: observed,
      visualOffsetMeters: visualOffset,
      renderedHeight: observed + visualOffset,
      // Backwards-compatible read-only rendering height for older callers and diagnostics.
      height: observed + visualOffset,
    };
  }

  function validCoordinates(coordinates) {
    return Number.isFinite(coordinates.longitude)
      && Number.isFinite(coordinates.latitude)
      && Number.isFinite(coordinates.observedAltitudeMeters)
      && Number.isFinite(coordinates.visualOffsetMeters)
      && Number.isFinite(coordinates.renderedHeight)
      && coordinates.longitude >= -180
      && coordinates.longitude <= 180
      && coordinates.latitude >= -90
      && coordinates.latitude <= 90;
  }

  function warnInvalidCoordinates(context, coordinates) {
    console.warn("Invalid geographic marker coordinates", {
      layerId: context.layerId,
      markerId: context.markerId,
      type: context.type,
      longitude: coordinates.longitude,
      latitude: coordinates.latitude,
      observedAltitudeMeters: coordinates.observedAltitudeMeters,
      visualOffsetMeters: coordinates.visualOffsetMeters,
      renderedHeight: coordinates.renderedHeight,
    });
  }

  function markerKey(layerId, markerId, canonicalRegionId = "global") {
    return `${String(canonicalRegionId || "global")}:${String(layerId)}:${String(markerId)}`;
  }

  function visualOffsetForCamera(cameraHeight, markerType = "default") {
    const base = MARKER_VISUAL_OFFSETS_METERS[markerType] ?? MARKER_VISUAL_OFFSETS_METERS.default;
    // A marker's fixed pixel footprint represents many kilometres in orbital
    // views. Keep its geographic anchor unchanged, but raise the rendering-only
    // Cartesian position enough that the entire billboard clears the limb.
    if (cameraHeight > 10000000) return Math.max(base, 40000);
    if (cameraHeight > 2000000) return Math.max(base, 12000);
    if (cameraHeight > 500000) return 4000;
    return 800;
  }

  function createGeographicMarker({ layerId, markerId, canonicalRegionId = "global", longitude, latitude, observedAltitudeMeters = 0, visualOffsetMeters = 0, visualCategory = "default", height, type = "point", label = null, metadata = null }, CesiumApi = global.Cesium) {
    const coordinates = normalizeCoordinates({ longitude, latitude, observedAltitudeMeters: height ?? observedAltitudeMeters, visualOffsetMeters });
    const context = { layerId, markerId, canonicalRegionId, type };
    if (!layerId || markerId === null || markerId === undefined || !validCoordinates(coordinates)) {
      warnInvalidCoordinates(context, coordinates);
      return null;
    }
    if (!CesiumApi?.Cartesian3?.fromDegrees) throw new Error("Cesium Cartesian3.fromDegrees is unavailable.");
    return {
      id: markerKey(layerId, markerId, canonicalRegionId),
      layerId: String(layerId),
      markerId: String(markerId),
      canonicalRegionId: String(canonicalRegionId || "global"),
      longitude: coordinates.longitude,
      latitude: coordinates.latitude,
      observedAltitudeMeters: coordinates.observedAltitudeMeters,
      visualOffsetMeters: coordinates.visualOffsetMeters,
      visualCategory,
      renderedHeight: coordinates.renderedHeight,
      height: coordinates.renderedHeight,
      type,
      label,
      metadata,
      cartesianPosition: CesiumApi.Cartesian3.fromDegrees(coordinates.longitude, coordinates.latitude, coordinates.renderedHeight),
    };
  }

  const GRAPHICS_CONSTRUCTORS = Object.freeze({
    billboard: "BillboardGraphics",
    ellipse: "EllipseGraphics",
    label: "LabelGraphics",
    point: "PointGraphics",
  });

  function graphicsValue(CesiumApi, key, value) {
    if (value === undefined || value === null) return undefined;
    const Constructor = CesiumApi[GRAPHICS_CONSTRUCTORS[key]];
    return Constructor && !(value instanceof Constructor) ? new Constructor(value) : value;
  }

  function constantProperty(CesiumApi, value) {
    return CesiumApi.ConstantProperty ? new CesiumApi.ConstantProperty(value) : value;
  }

  function constantPosition(CesiumApi, value) {
    return CesiumApi.ConstantPositionProperty ? new CesiumApi.ConstantPositionProperty(value) : value;
  }

  function upsertCesiumEntity({
    collection,
    layerId,
    markerId,
    canonicalRegionId = "global",
    longitude,
    latitude,
    height,
    observedAltitudeMeters = 0,
    visualOffsetMeters = 0,
    visualCategory = "default",
    type = "point",
    label = null,
    metadata = null,
    entityOptions = {},
    CesiumApi = global.Cesium,
  }) {
    if (!collection?.getById || !collection?.add) throw new TypeError("A Cesium EntityCollection is required.");
    const marker = createGeographicMarker({ layerId, markerId, canonicalRegionId, longitude, latitude, height, observedAltitudeMeters, visualOffsetMeters, visualCategory, type, label, metadata }, CesiumApi);
    if (!marker) return null;

    let entity = collection.getById(marker.id);
    if (!entity) {
      entity = collection.add({ ...entityOptions, id: marker.id, position: marker.cartesianPosition });
    } else {
      entity.name = entityOptions.name ?? entity.name;
      entity.position = constantPosition(CesiumApi, marker.cartesianPosition);
      if (Object.prototype.hasOwnProperty.call(entityOptions, "description")) {
        entity.description = constantProperty(CesiumApi, entityOptions.description);
      }
      Object.keys(GRAPHICS_CONSTRUCTORS).forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(entityOptions, key)) entity[key] = graphicsValue(CesiumApi, key, entityOptions[key]);
      });
    }

    markerRegistry.set(marker.id, {
      ...marker,
      collection,
      entity,
      rendererType: "cesium-native",
    });
    return entity;
  }

  function removeMarker(id) {
    const record = markerRegistry.get(id);
    if (!record) return false;
    if (record.rendererType === "html-overlay") record.element?.remove();
    else record.collection?.remove?.(record.entity);
    markerRegistry.delete(id);
    return true;
  }

  function reconcileLayer(layerId, activeMarkerIds, canonicalRegionId = null) {
    const activeKeys = new Set([...activeMarkerIds].map((id) => markerKey(layerId, id, canonicalRegionId || "global")));
    let removed = 0;
    [...markerRegistry.values()].forEach((record) => {
      if (record.layerId === String(layerId)
        && (!canonicalRegionId || record.canonicalRegionId === String(canonicalRegionId))
        && !activeKeys.has(record.id)
        && removeMarker(record.id)) removed += 1;
    });
    return removed;
  }

  function removeLayer(layerId) {
    return reconcileLayer(layerId, []);
  }

  function geographicCartesianPosition(input, options = {}, CesiumApi = global.Cesium) {
    const coordinates = normalizeCoordinates(input, options);
    if (!validCoordinates(coordinates)) {
      warnInvalidCoordinates({ layerId: options.layerId, markerId: options.markerId, type: options.type }, coordinates);
      return null;
    }
    return CesiumApi.Cartesian3.fromDegrees(coordinates.longitude, coordinates.latitude, coordinates.renderedHeight);
  }

  function isPositionVisible(position, scene, CesiumApi = global.Cesium) {
    if (!position || !scene?.camera?.positionWC || !scene?.globe?.ellipsoid) return false;
    const normal = scene.globe.ellipsoid.geodeticSurfaceNormal(position, new CesiumApi.Cartesian3());
    const cameraDirection = CesiumApi.Cartesian3.normalize(
      CesiumApi.Cartesian3.subtract(scene.camera.positionWC, position, new CesiumApi.Cartesian3()),
      new CesiumApi.Cartesian3(),
    );
    return CesiumApi.Cartesian3.dot(normal, cameraDirection) > HORIZON_SAFETY_THRESHOLD;
  }

  function canvasVisibility(position, scene, CesiumApi = global.Cesium) {
    const canvasPosition = CesiumApi.SceneTransforms.worldToWindowCoordinates(scene, position);
    const insideCanvas = Boolean(canvasPosition)
      && canvasPosition.x >= 0
      && canvasPosition.y >= 0
      && canvasPosition.x <= scene.canvas.clientWidth
      && canvasPosition.y <= scene.canvas.clientHeight;
    const frontFacing = isPositionVisible(position, scene, CesiumApi);
    return { canvasPosition, frontFacing, insideCanvas, visible: frontFacing && insideCanvas };
  }

  function createHtmlOverlayController(scene, CesiumApi = global.Cesium) {
    const overlays = new Map();
    const update = () => {
      overlays.forEach((marker) => {
        const visibility = canvasVisibility(marker.cartesianPosition, scene, CesiumApi);
        marker.frontFacing = visibility.frontFacing;
        marker.insideCanvas = visibility.insideCanvas;
        marker.element.style.display = visibility.visible ? "" : "none";
        if (visibility.visible) {
          marker.element.style.transform = `translate3d(${visibility.canvasPosition.x}px, ${visibility.canvasPosition.y}px, 0)`;
        }
      });
    };
    const removePostRender = scene.postRender.addEventListener(update);
    return {
      add(options) {
        const marker = createGeographicMarker(options, CesiumApi);
        if (!marker || !options.element) return null;
        const record = { ...marker, element: options.element, rendererType: "html-overlay", frontFacing: false, insideCanvas: false };
        overlays.set(marker.id, record);
        markerRegistry.set(marker.id, record);
        update();
        return record;
      },
      remove(id) {
        overlays.delete(id);
        return removeMarker(id);
      },
      destroy() {
        [...overlays.keys()].forEach(removeMarker);
        overlays.clear();
        removePostRender?.();
      },
      update,
    };
  }

  function debugSnapshot(scene, CesiumApi = global.Cesium) {
    return [...markerRegistry.values()].map((record) => {
      const visibility = scene ? canvasVisibility(record.cartesianPosition, scene, CesiumApi) : { frontFacing: null, insideCanvas: null };
      return {
        layerId: record.layerId,
        markerId: record.markerId,
        canonicalRegionId: record.canonicalRegionId,
        longitude: record.longitude,
        latitude: record.latitude,
        observedAltitudeMeters: record.observedAltitudeMeters,
        visualOffsetMeters: record.visualOffsetMeters,
        renderedHeight: record.renderedHeight,
        markerImplementationType: record.type,
        rendererType: record.rendererType,
        frontFacing: visibility.frontFacing,
        insideCanvas: visibility.insideCanvas,
      };
    });
  }

  function logDebugSnapshot(scene, CesiumApi = global.Cesium) {
    if (!debugEnabled) return [];
    const rows = debugSnapshot(scene, CesiumApi);
    console.table(rows);
    return rows;
  }

  function verifyNoDrift({ time, toleranceMeters = 0.01, CesiumApi = global.Cesium } = {}) {
    const rows = [];
    markerRegistry.forEach((record) => {
      if (record.rendererType !== "cesium-native") return;
      const expected = CesiumApi.Cartesian3.fromDegrees(record.longitude, record.latitude, record.renderedHeight);
      const actual = record.entity?.position?.getValue ? record.entity.position.getValue(time ?? CesiumApi.JulianDate?.now?.()) : record.entity?.position;
      const errorMeters = actual ? CesiumApi.Cartesian3.distance(expected, actual) : Number.POSITIVE_INFINITY;
      rows.push({ id: record.id, layerId: record.layerId, errorMeters });
      if (errorMeters > toleranceMeters) throw new Error(`Marker drift detected: ${record.id}, error=${errorMeters}m`);
    });
    return rows;
  }

  function setDebugEnabled(enabled) {
    debugEnabled = Boolean(enabled);
  }

  function updateCesiumVisibility(scene, CesiumApi = global.Cesium) {
    let updated = 0;
    markerRegistry.forEach((record) => {
      if (record.rendererType !== "cesium-native" || !record.entity) return;
      const visible = isPositionVisible(record.cartesianPosition, scene, CesiumApi);
      if (record.entity.show !== visible) {
        record.entity.show = visible;
        updated += 1;
      }
    });
    return updated;
  }

  function updateVisualOffsetsForCamera(cameraHeight, CesiumApi = global.Cesium) {
    let updated = 0;
    markerRegistry.forEach((record) => {
      if (record.rendererType !== "cesium-native") return;
      const nextOffset = visualOffsetForCamera(cameraHeight, record.visualCategory);
      if (nextOffset === record.visualOffsetMeters) return;
      record.visualOffsetMeters = nextOffset;
      record.renderedHeight = record.observedAltitudeMeters + nextOffset;
      record.height = record.renderedHeight;
      record.cartesianPosition = CesiumApi.Cartesian3.fromDegrees(record.longitude, record.latitude, record.renderedHeight);
      record.entity.position = constantPosition(CesiumApi, record.cartesianPosition);
      updated += 1;
    });
    return updated;
  }

  global.PCSGeographicMarkers = Object.freeze({
    createGeographicMarker,
    createHtmlOverlayController,
    debugSnapshot,
    geographicCartesianPosition,
    isPositionVisible,
    logDebugSnapshot,
    markerKey,
    MARKER_VISUAL_OFFSETS_METERS,
    normalizeCoordinates,
    reconcileLayer,
    removeLayer,
    removeMarker,
    setDebugEnabled,
    upsertCesiumEntity,
    updateCesiumVisibility,
    updateVisualOffsetsForCamera,
    validCoordinates,
    visualOffsetForCamera,
    verifyNoDrift,
  });
})(typeof window === "undefined" ? globalThis : window);
