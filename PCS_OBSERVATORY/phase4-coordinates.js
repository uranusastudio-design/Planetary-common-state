(function exposePhase4Coordinates(global){
  "use strict";
  const Phase3=global.PCSPhase3Coordinates;
  if(!Phase3)return;
  const DEG=Math.PI/180;
  const C_KM_S=299792.458;
  const MPC_TO_KM=3.0856775814913673e19;
  const GALACTIC_TO_SUPERGALACTIC=Object.freeze([
    Object.freeze([-0.735742574804,0.677261296414,0]),
    Object.freeze([-0.074553778365,-0.080991471307,0.993922590400]),
    Object.freeze([0.673145302109,0.731271165817,0.110081262225])
  ]);
  const PLANCK18=Object.freeze({id:"pcs-planck18-flat-lambda-cdm-v1",H0KmSPerMpc:67.66,OmegaM:0.30966,OmegaLambda:0.6888463055445441,OmegaRadiation:0.0014936944554559178,TcmbK:2.7255,source:"Planck Collaboration 2020, Table 2; Astropy Planck18 reference values"});
  const TRANSFORM=Object.freeze({id:"pcs-supergalactic-astropy-v1",supergalacticNorthPoleGalactic:Object.freeze({longitudeDeg:47.37,latitudeDeg:6.32}),supergalacticLongitudeZeroPositionAngleDeg:90,sourceEpoch:"J2000/ICRS where applicable",source:"Astropy Supergalactic frame definition following de Vaucouleurs conventions"});
  const multiply=(matrix,vector)=>matrix.map(row=>row.reduce((sum,value,index)=>sum+value*vector[index],0));
  const transpose=matrix=>matrix[0].map((_,column)=>matrix.map(row=>row[column]));
  const normalizeLongitude=value=>(value%360+360)%360;
  function sphericalToCartesian(longitudeDeg,latitudeDeg,distance=1){const lon=longitudeDeg*DEG,lat=latitudeDeg*DEG,c=Math.cos(lat);return [distance*c*Math.cos(lon),distance*c*Math.sin(lon),distance*Math.sin(lat)];}
  function cartesianToSpherical(vector){const radius=Math.hypot(...vector);if(!radius)return {longitudeDeg:0,latitudeDeg:0,distance:0};return {longitudeDeg:normalizeLongitude(Math.atan2(vector[1],vector[0])/DEG),latitudeDeg:Math.asin(vector[2]/radius)/DEG,distance:radius};}
  function galacticToSupergalactic(longitudeDeg,latitudeDeg,distance=1){return cartesianToSpherical(multiply(GALACTIC_TO_SUPERGALACTIC,sphericalToCartesian(longitudeDeg,latitudeDeg,distance)));}
  function supergalacticToGalactic(longitudeDeg,latitudeDeg,distance=1){return cartesianToSpherical(multiply(transpose(GALACTIC_TO_SUPERGALACTIC),sphericalToCartesian(longitudeDeg,latitudeDeg,distance)));}
  function icrsToGalactic(raDeg,decDeg,distance=1){return cartesianToSpherical(multiply(Phase3.ICRS_TO_GALACTIC,sphericalToCartesian(raDeg,decDeg,distance)));}
  function galacticToIcrs(longitudeDeg,latitudeDeg,distance=1){return cartesianToSpherical(multiply(transpose(Phase3.ICRS_TO_GALACTIC),sphericalToCartesian(longitudeDeg,latitudeDeg,distance)));}
  function icrsToSupergalactic(raDeg,decDeg,distance=1){const galactic=icrsToGalactic(raDeg,decDeg,distance);return galacticToSupergalactic(galactic.longitudeDeg,galactic.latitudeDeg,galactic.distance);}
  function supergalacticCartesian(longitudeDeg,latitudeDeg,distanceMpc){return sphericalToCartesian(longitudeDeg,latitudeDeg,distanceMpc);}
  function expansionE(z,cosmology=PLANCK18){return Math.sqrt(cosmology.OmegaRadiation*(1+z)**4+cosmology.OmegaM*(1+z)**3+cosmology.OmegaLambda);}
  function integrateSimpson(fn,start,end,steps=2048){const n=steps%2?steps+1:steps,h=(end-start)/n;let sum=fn(start)+fn(end);for(let i=1;i<n;i++)sum+=fn(start+i*h)*(i%2?4:2);return sum*h/3;}
  function comovingDistanceMpc(redshift,cosmology=PLANCK18){const z=Number(redshift);if(!Number.isFinite(z)||z<0)return null;return C_KM_S/cosmology.H0KmSPerMpc*integrateSimpson(value=>1/expansionE(value,cosmology),0,z,Math.max(256,Math.ceil(z*1024)));}
  function luminosityDistanceMpc(redshift,cosmology=PLANCK18){const comoving=comovingDistanceMpc(redshift,cosmology);return comoving==null?null:comoving*(1+Number(redshift));}
  function angularDiameterDistanceMpc(redshift,cosmology=PLANCK18){const comoving=comovingDistanceMpc(redshift,cosmology);return comoving==null?null:comoving/(1+Number(redshift));}
  function sceneRadiusMpc(radiusMpc,mode,domain="nearby-groups"){if(mode==="scientific")return Math.max(0,radiusMpc)*1e7;const base={"nearby-groups":7e7,virgo:8e7,laniakea:9e7,"cosmic-web":1.05e8,"observable-universe":1.2e8}[domain]||7e7;return base*Math.log10(1+Math.max(0,radiusMpc));}
  function scenePosition(cartesianMpc,mode,domain="nearby-groups"){const radius=Math.hypot(...cartesianMpc);if(!radius)return [0,0,0];const mapped=sceneRadiusMpc(radius,mode,domain);return cartesianMpc.map(value=>value/radius*mapped);}
  function validateAdapter(adapter){const required=["sourceFrame","sourceEpoch","distanceConvention","redshiftConvention","cosmologyAssumption","transformVersion"],missing=required.filter(key=>adapter?.[key]==null||adapter[key]==="");return {valid:missing.length===0,missing};}
  global.PCSPhase4Coordinates=Object.freeze({DEG,C_KM_S,MPC_TO_KM,GALACTIC_TO_SUPERGALACTIC,PLANCK18,TRANSFORM,multiply,transpose,sphericalToCartesian,cartesianToSpherical,galacticToSupergalactic,supergalacticToGalactic,icrsToGalactic,galacticToIcrs,icrsToSupergalactic,supergalacticCartesian,expansionE,comovingDistanceMpc,luminosityDistanceMpc,angularDiameterDistanceMpc,sceneRadiusMpc,scenePosition,validateAdapter});
})(typeof window==="undefined"?globalThis:window);
