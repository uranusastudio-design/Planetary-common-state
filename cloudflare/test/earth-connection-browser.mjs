import assert from "node:assert/strict";

const targetList = await fetch("http://127.0.0.1:9223/json/list").then((response) => response.json());
const target = targetList.find((item) => item.type === "page");
assert(target?.webSocketDebuggerUrl, "Chrome page target unavailable");

const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});
let id = 0;
const pending = new Map();
const exceptions = [];
const consoleErrors = [];
const networkFailures = [];
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    return message.error ? reject(new Error(message.error.message)) : resolve(message.result);
  }
  if (message.method === "Runtime.exceptionThrown") exceptions.push(message.params.exceptionDetails?.text || "exception");
  if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") consoleErrors.push(message.params.args.map((arg) => arg.value || arg.description).join(" "));
  if (message.method === "Network.loadingFailed") networkFailures.push({ url: message.params.requestId, error: message.params.errorText });
});
function call(method, params = {}) {
  const requestId = ++id;
  socket.send(JSON.stringify({ id: requestId, method, params }));
  return new Promise((resolve, reject) => pending.set(requestId, { resolve, reject }));
}
await call("Runtime.enable");
await call("Network.enable");
await call("Page.enable");
await call("Page.navigate", { url: "http://127.0.0.1:8000/phase2-runtime-harness" });
await new Promise((resolve) => setTimeout(resolve, 500));
const evaluated = await call("Runtime.evaluate", {
  expression: `(async()=>{document.body.innerHTML='<main></main>';const response=await fetch('http://127.0.0.1:8787/api/layers');const payload=await response.json();const layers=payload.layers.filter(x=>['sea-level','sea-ice','wildfire','precipitation'].includes(x.id)).map(x=>({id:x.id,status:x.retrieval_status,provider:x.provider,value:x.value,details:x.details}));document.querySelector('main').dataset.boundLayers=layers.map(x=>x.id).join(',');return {responseOk:response.ok,layers,boundLayers:document.querySelector('main').dataset.boundLayers};})()`,
  awaitPromise: true,
  returnByValue: true,
});
const result = evaluated.result.value;
assert.equal(result.responseOk, true);
const gmsl = result.layers.find((item) => item.id === "sea-level");
const nsidc = result.layers.find((item) => item.id === "sea-ice");
assert.equal(gmsl.provider, "NOAA Laboratory for Satellite Altimetry");
assert(["LIVE", "LATEST"].includes(gmsl.status));
assert.equal(nsidc.provider, "NOAA / NSIDC");
assert(nsidc.details.hemispheres.arctic.value > 0);
assert(nsidc.details.hemispheres.antarctic.value > 0);
assert.equal(exceptions.length, 0);
assert.equal(consoleErrors.length, 0);
const report = { status: "PASS", result, console_errors: consoleErrors, exceptions, network_failures: networkFailures };
console.log(JSON.stringify(report, null, 2));
socket.close();
