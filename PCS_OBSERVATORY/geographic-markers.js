(function exposePcsGeographicMarkers(global) {
  "use strict";

  const markerRegistry = new Map();
  let debugEnabled = false;

  function normalizeCoordinates(input, options = {}) {
    let longitude;
    let latitude;
    let height;

    if (Array.isArray(input)) {
      if (options.coordinateOrder !== "geojson") {
        throw new TypeError("Array coordinates require coordinateOrder: geojson ([longitude, latitude, height]).");
      }
      [longitude, latitude, height] = input;
    } else {
      longitude = input?.longitude ?? input?.lon ?? input?.lng;
      latitude = input?.latitude ?? input?.lat;
      height = input?.height ?? input?.altitude ?? input?.altitude_m;
    }

    return {
      longitude: Number(longitude),
      latitude: Number(latitude),
      height: height === null || height === undefined || height === "" ? Number(options.defaultHeight ?? 0) : Number(height),
    };
  }

  function validCoordinates(coordinates) {
    return Number.isFinite(coordinates.longitude)
      && Number.isFinite(coordinates.latitude)
      && Number.isFinite(coordinates.height)
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
      height: coordinates.height,
    });
  }

  function markerKey(layerId, markerId) {
    return `${String(layerId)}:${String(markerId)}`;
  }

  function createGeographicMarker({ layerId, markerId, longitude, latitude, height = 0, type = "point", label = null, metadata = null }, CesiumApi = global.Cesium) {
    const coordinates = normalizeCoordinates({ longitude, latitude, height });
    const context = { layerId, markerId, type };
    if (!layerId || markerId === null || markerId === undefined || !validCoordinates(coordinates)) {
      warnInvalidCoordinates(context, coordinates);
      return null;
    }
    if (!CesiumApi?.Cartesian3?.fromDegrees) throw new Error("Cesium Cartesian3.fromDegrees is unavailable.");
    return {
      id: markerKey(layerId, markerId),
      layerId: String(layerId),
      markerId: String(markerId),
      longitude: coordinates.longitude,
      latitude: coordinates.latitude,
      height: coordinates.height,
      type,
      label,
      metadata,
      cartesianPosition: CesiumApi.Cartesian3.fromDegrees(coordinates.longitude, coordinates.latitude, coordinates.height),
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
    longitude,
    latitude,
    height = 0,
    type = "point",
    label = null,
    metadata = null,
    entityOptions = {},
    CesiumApi = global.Cesium,
  }) {
    if (!collection?.getById || !collection?.add) throw new TypeError("A Cesium EntityCollection is required.");
    const marker = createGeographicMarker({ layerId, markerId, longitude, latitude, height, type, label, metadata }, CesiumApi);
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

  function reconcileLayer(layerId, activeMarkerIds) {
    const activeKeys = new Set([...activeMarkerIds].map((id) => markerKey(layerId, id)));
    let removed = 0;
    [...markerRegistry.values()].forEach((record) => {
      if (record.layerId === String(layerId) && !activeKeys.has(record.id) && removeMarker(record.id)) removed += 1;
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
    return CesiumApi.Cartesian3.fromDegrees(coordinates.longitude, coordinates.latitude, coordinates.height);
  }

  function isPositionVisible(position, scene, CesiumApi = global.Cesium) {
    if (!position || !scene?.camera?.positionWC || !scene?.globe?.ellipsoid) return false;
    const normal = scene.globe.ellipsoid.geodeticSurfaceNormal(position, new CesiumApi.Cartesian3());
    const cameraDirection = CesiumApi.Cartesian3.normalize(
      CesiumApi.Cartesian3.subtract(scene.camera.positionWC, position, new CesiumApi.Cartesian3()),
      new CesiumApi.Cartesian3(),
    );
    return CesiumApi.Cartesian3.dot(normal, cameraDirection) > 0;
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
        longitude: record.longitude,
        latitude: record.latitude,
        height: record.height,
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
      const expected = CesiumApi.Cartesian3.fromDegrees(record.longitude, record.latitude, record.height);
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

  global.PCSGeographicMarkers = Object.freeze({
    createGeographicMarker,
    createHtmlOverlayController,
    debugSnapshot,
    geographicCartesianPosition,
    isPositionVisible,
    logDebugSnapshot,
    markerKey,
    normalizeCoordinates,
    reconcileLayer,
    removeLayer,
    removeMarker,
    setDebugEnabled,
    upsertCesiumEntity,
    validCoordinates,
    verifyNoDrift,
  });
})(typeof window === "undefined" ? globalThis : window);
