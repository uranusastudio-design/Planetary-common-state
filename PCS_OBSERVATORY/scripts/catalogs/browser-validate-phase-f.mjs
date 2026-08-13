const port=Number(process.env.PCS_CDP_PORT||9223),targets=await fetch(`http://127.0.0.1:${port}/json/list`).then(response=>response.json()),target=targets.find(item=>item.type==="page"&&/PCS_OBSERVATORY/.test(item.url));
if(!target)throw new Error("PCS Observatory CDP page not found");
const socket=new WebSocket(target.webSocketDebuggerUrl),pending=new Map(),events=[],exceptions=[],consoleErrors=[],networkFailures=[],requests=new Map();let sequence=0;
await new Promise((resolve,reject)=>{socket.addEventListener("open",resolve,{once:true});socket.addEventListener("error",reject,{once:true});});
socket.addEventListener("message",event=>{const message=JSON.parse(event.data);if(message.id&&pending.has(message.id)){const {resolve,reject}=pending.get(message.id);pending.delete(message.id);message.error?reject(new Error(message.error.message)):resolve(message.result);return;}events.push(message);if(message.method==="Runtime.exceptionThrown")exceptions.push(message.params.exceptionDetails);if(message.method==="Runtime.consoleAPICalled"&&message.params.type==="error")consoleErrors.push(message.params);if(message.method==="Network.requestWillBeSent")requests.set(message.params.requestId,message.params.request.url);if(message.method==="Network.loadingFailed"&&!message.params.canceled)networkFailures.push({...message.params,url:requests.get(message.params.requestId)||null});});
const command=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
await Promise.all([command("Runtime.enable"),command("Network.enable"),command("Page.enable")]);
await command("Page.reload",{ignoreCache:true});
await new Promise(resolve=>setTimeout(resolve,3500));
const expression=`(async()=>{
  const wait=async predicate=>{for(let i=0;i<100;i++){if(predicate())return true;await new Promise(resolve=>setTimeout(resolve,100));}throw new Error("runtime wait timeout");};
  await wait(()=>window.PCSDeepSpaceManager?.debug?.().initialized);
  window.PCSDeepSpaceManager.open();await wait(()=>window.PCSDeepSpaceManager.isOpen());
  await window.PCSDeepSpaceManager.enterMilkyWay();
  const terms=["Pillars of Creation","M16","Horsehead","Barnard 33","NGC 6543","M1","Sgr A*","Gaia BH3","M87*","Kepler-186"],results=[];
  for(const term of terms){const record=await window.PCSDeepSpaceManager.searchPhase3(term);results.push({term,id:record?.pcsObjectId||record?.id||null,name:record?.officialName||record?.canonicalName||null,cardId:document.querySelector("[data-object-card]")?.dataset.objectId||null,context:window.PCSDeepSpaceManager.debug().scaleContext,lastObjectFocus:window.PCSDeepSpaceManager.debug().lastObjectFocus});}
  const debug=window.PCSDeepSpaceManager.debug(),cardGroups=document.querySelectorAll("[data-object-card] details").length;
  return {results,viewerCount:debug.viewerCount,cesiumCanvasCount:debug.cesiumCanvasCount,knownCatalog:window.PCSKnownAstronomicalObjects?true:false,cardGroups,dataSourceCount:window.PCSViewer?.dataSources?.length??null,debug};
})()`;
const evaluation=await command("Runtime.evaluate",{expression,awaitPromise:true,returnByValue:true,userGesture:true});
if(evaluation.exceptionDetails)exceptions.push(evaluation.exceptionDetails);
const value=evaluation.result?.value;
socket.close();
const consoleMessages=consoleErrors.map(item=>item.args?.map(arg=>arg.value||arg.description).join(" ")),featurePattern=/known-astronomical-objects|known-object catalog|deep-space\.js\?v=known-objects-phase-f/i,featureConsoleErrors=consoleMessages.filter(message=>featurePattern.test(message)),requiredNetworkFailures=networkFailures.filter(item=>featurePattern.test(item.url||"")&&!/ERR_ABORTED/.test(item.errorText));
console.log(JSON.stringify({value,exceptions:exceptions.map(item=>item.text||item.exception?.description),featureConsoleErrors,ambientConsoleErrors:consoleMessages.filter(message=>!featurePattern.test(message)),requiredNetworkFailures:requiredNetworkFailures.map(item=>({url:item.url,errorText:item.errorText,blockedReason:item.blockedReason})),ambientNetworkFailureCount:networkFailures.length-requiredNetworkFailures.length},null,2));
if(!value||exceptions.length||featureConsoleErrors.length||requiredNetworkFailures.length||value.viewerCount!==1||value.cesiumCanvasCount!==1||value.results.some(result=>!result.id||result.cardId!==result.id))process.exitCode=1;
