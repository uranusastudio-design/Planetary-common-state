import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const source=await readFile(new URL("./milky-way-layer.js",import.meta.url),"utf8");
const index=await readFile(new URL("./index.html",import.meta.url),"utf8");
const registry=JSON.parse(await readFile(new URL("./assets/deep-space/phase-3/milky-way-hmsfr.json",import.meta.url),"utf8"));

test("Milky Way layer uses primitive collections and the existing Viewer",()=>{assert.match(source,/PointPrimitiveCollection/);assert.match(source,/PolylineCollection/);assert.match(source,/LabelCollection/);assert.doesNotMatch(source,/new Cesium\.Viewer|createElement\(["']canvas|requestAnimationFrame/);});
test("all 199 observed HMSFR tracers remain available to the layer",()=>{assert.equal(registry.records.length,199);assert.ok(registry.records.every(record=>record.dataStatus==="catalog-observation"&&record.visualizationStatus==="observed-tracer"));});
test("arm reconstruction is derived only from published arm-coded tracers",()=>{assert.match(source,/armGroups\(records\)/);assert.match(source,/record\.spiralArmCode/);assert.doesNotMatch(source,/Math\.random|random/i);});
test("Sun, Sagittarius A star, disk context and bar are explicit",()=>{for(const token of ["milky-way:sun","milky-way:sgr-a-star","ring(radius)","barAngle=27"])assert.ok(source.includes(token));});
test("layer lifecycle is complete",()=>{for(const method of ["load(","show()","hide()","unload()","dispose()","setLabels(","setReconstruction("])assert.ok(source.includes(method));});
