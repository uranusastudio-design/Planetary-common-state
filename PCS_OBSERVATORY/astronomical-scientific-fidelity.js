(function exposeAstronomicalScientificFidelity(global){
  "use strict";

  const LEVELS=Object.freeze({
    A:Object.freeze({id:"A",key:"precisionEphemeris",canonicalName:"Precision Ephemeris"}),
    B:Object.freeze({id:"B",key:"catalogDerived",canonicalName:"Catalog-Derived"}),
    C:Object.freeze({id:"C",key:"observationReconstruction",canonicalName:"Observation-Derived Reconstruction"}),
    D:Object.freeze({id:"D",key:"representativeLargeScale",canonicalName:"Representative Large-Scale Visualization"}),
    E:Object.freeze({id:"E",key:"observationalSkyMap",canonicalName:"Observational Sky Map"})
  });
  const COPY=Object.freeze({
    en:Object.freeze({scientificFidelity:"Scientific Fidelity",precisionEphemeris:"Precision Ephemeris",catalogDerived:"Catalog-Derived",observationReconstruction:"Observation-Derived Reconstruction",representativeLargeScale:"Representative Large-Scale Visualization",observationalSkyMap:"Observational Sky Map",catalogObservation:"Catalog observation",reconstructedStructure:"Reconstructed structure",representativeDensityTracer:"Representative Density Tracer",referenceAnchor:"Measured / adopted reference anchor",youAreHere:"You Are Here / Sun",milkyWay:"Milky Way",galacticCenter:"Galactic Center",localArm:"Local Arm / Orion Spur",dataSource:"Data Source",reconstruction:"Reconstruction",uncertainty:"Uncertainty",knownLimitations:"Known Limitations",precisionNotice:"Positions and time behavior derive from authoritative ephemerides or validated orbital data.",catalogNotice:"Displayed objects retain catalog identity and measured astrometry; catalog uncertainty and completeness limits apply.",reconstructionNotice:"The large-scale structure combines observations with a scientific reconstruction; representative tracers are not individual measured stars.",representativeNotice:"The view represents scientifically constrained large-scale structure; visible points do not all have exact measured 3D coordinates.",skyMapNotice:"This is observed all-sky data projected on a celestial sphere, not a literal physical shell."}),
    "zh-TW":Object.freeze({scientificFidelity:"科學忠實度",precisionEphemeris:"精密星曆",catalogDerived:"星表推導",observationReconstruction:"觀測推導重建",representativeLargeScale:"代表性大尺度視覺化",observationalSkyMap:"觀測全天圖",catalogObservation:"星表觀測",reconstructedStructure:"重建結構",representativeDensityTracer:"代表性密度示蹤點",referenceAnchor:"量測／採用的參考錨點",youAreHere:"你在這裡／太陽",milkyWay:"銀河系",galacticCenter:"銀河中心",localArm:"本地臂／獵戶座支臂",dataSource:"資料來源",reconstruction:"重建",uncertainty:"不確定性",knownLimitations:"已知限制",precisionNotice:"位置與時間行為源自權威星曆或已驗證軌道資料。",catalogNotice:"顯示物件保留星表身分與量測天體測量資料；星表不確定性及完整度限制仍適用。",reconstructionNotice:"大尺度結構結合觀測與科學重建；代表性示蹤點不是逐一量測的恆星。",representativeNotice:"此視圖呈現受科學約束的大尺度結構；並非所有可見點都有精確量測的三維座標。",skyMapNotice:"這是投影至天球的觀測全天資料，不是包圍觀測者的實體外殼。"}),
    ja:Object.freeze({scientificFidelity:"科学的忠実度",precisionEphemeris:"精密天体暦",catalogDerived:"カタログ由来",observationReconstruction:"観測由来の再構成",representativeLargeScale:"代表的大規模可視化",observationalSkyMap:"観測全天マップ",catalogObservation:"カタログ観測",reconstructedStructure:"再構成構造",representativeDensityTracer:"代表密度トレーサー",referenceAnchor:"測定／採用された基準アンカー",youAreHere:"現在地／太陽",milkyWay:"天の川銀河",galacticCenter:"銀河中心",localArm:"ローカルアーム／オリオン支腕",dataSource:"データソース",reconstruction:"再構成",uncertainty:"不確かさ",knownLimitations:"既知の制限",precisionNotice:"位置と時間変化は権威ある天体暦または検証済み軌道データに由来します。",catalogNotice:"表示天体はカタログ同定と測定アストロメトリを保持し、カタログの不確かさと完全性の制限が適用されます。",reconstructionNotice:"大規模構造は観測と科学的再構成を組み合わせています。代表トレーサーは個別に測定された恒星ではありません。",representativeNotice:"科学的制約を受けた大規模構造の表現であり、すべての点に正確な測定3D座標があるわけではありません。",skyMapNotice:"天球へ投影した観測全天データであり、観測者を囲む物理的な殻ではありません。"}),
    ko:Object.freeze({scientificFidelity:"과학적 충실도",precisionEphemeris:"정밀 천체력",catalogDerived:"카탈로그 기반",observationReconstruction:"관측 기반 재구성",representativeLargeScale:"대표 대규모 시각화",observationalSkyMap:"관측 전천 지도",catalogObservation:"카탈로그 관측",reconstructedStructure:"재구성 구조",representativeDensityTracer:"대표 밀도 추적자",referenceAnchor:"측정／채택 기준 앵커",youAreHere:"현재 위치／태양",milkyWay:"우리은하",galacticCenter:"은하 중심",localArm:"국부팔／오리온 지선",dataSource:"자료 출처",reconstruction:"재구성",uncertainty:"불확도",knownLimitations:"알려진 한계",precisionNotice:"위치와 시간 변화는 권위 있는 천체력 또는 검증된 궤도 자료에서 유도됩니다.",catalogNotice:"표시 천체는 카탈로그 식별과 측정된 측성 자료를 유지하며 카탈로그 불확도와 완전성 한계가 적용됩니다.",reconstructionNotice:"대규모 구조는 관측과 과학적 재구성을 결합합니다. 대표 추적자는 개별 측정 별이 아닙니다.",representativeNotice:"과학적으로 제약된 대규모 구조를 나타내며 모든 점이 정확한 측정 3D 좌표를 갖는 것은 아닙니다.",skyMapNotice:"천구에 투영된 관측 전천 자료이며 관측자를 둘러싼 물리적 껍질이 아닙니다."})
  });
  const CONTRACTS=Object.freeze({
    solar:Object.freeze({id:"solar",distanceScale:"kilometres to hundreds of AU",defaultLevel:"A",datasets:["NASA/JPL ephemerides","NASA/JPL SBDB"],visibleObjectClasses:["Solar System bodies","small bodies","interstellar objects"],lod:"solid body → disc → point; orbit/trajectory by source contract",coordinateFrame:"ICRF/J2000 heliocentric or parent-relative",cameraLimits:"km–AU astronomical camera scale",precisionDisclaimer:"precisionNotice"}),
    nearby:Object.freeze({id:"nearby",distanceScale:"0–100 pc",defaultLevel:"B",datasets:["Gaia EDR3 GCNS","validated nearby-star landmarks"],visibleObjectClasses:["catalog stars","stellar systems"],lod:"catalog records capped by tier and device profile",coordinateFrame:"ICRS → heliocentric Galactic Cartesian",cameraLimits:"parsec neighborhood scale",precisionDisclaimer:"catalogNotice"}),
    "milky-way":Object.freeze({id:"milky-way",distanceScale:"parsecs to 40 kpc displayed stellar context",defaultLevel:"C",datasets:["Gaia EDR3 GCNS bridge","Reid et al. 2019 HMSFR","published structural models"],visibleObjectClasses:["catalog stars","HMSFRs","Galactic structures","representative density tracers"],lod:"catalog cross-fade plus deterministic desktop/mobile tracer budgets",coordinateFrame:"PCS Galactocentric right-handed Cartesian",cameraLimits:"pc–kpc astronomical camera scale",precisionDisclaimer:"reconstructionNotice"}),
    "local-group":Object.freeze({id:"local-group",distanceScale:"kiloparsecs to ~1.5 Mpc",defaultLevel:"C",datasets:["McConnachie Local Group catalog"],visibleObjectClasses:["catalog galaxies","reconstructed group context"],lod:"catalog landmarks and representative display sizes",coordinateFrame:"heliocentric Galactic Cartesian",cameraLimits:"kpc–Mpc",precisionDisclaimer:"reconstructionNotice"}),
    "galaxy-groups":Object.freeze({id:"galaxy-groups",distanceScale:"nearby Mpc",defaultLevel:"C",datasets:["Kourkchi & Tully nearby groups"],visibleObjectClasses:["catalog galaxies","galaxy groups"],lod:"catalog group and galaxy budgets",coordinateFrame:"Supergalactic Cartesian",cameraLimits:"Mpc",precisionDisclaimer:"reconstructionNotice"}),
    virgo:Object.freeze({id:"virgo",distanceScale:"cluster-scale Mpc",defaultLevel:"C",datasets:["EVCC"],visibleObjectClasses:["catalog galaxies","cluster context"],lod:"catalog points with representative marker scale",coordinateFrame:"ICRS/Supergalactic",cameraLimits:"tens of Mpc",precisionDisclaimer:"reconstructionNotice"}),
    laniakea:Object.freeze({id:"laniakea",distanceScale:"tens to hundreds of Mpc",defaultLevel:"D",datasets:["Cosmicflows peculiar-velocity context"],visibleObjectClasses:["catalog groups","reconstructed flow context"],lod:"survey-constrained representative sampling",coordinateFrame:"Supergalactic",cameraLimits:"hundreds of Mpc",precisionDisclaimer:"representativeNotice"}),
    "cosmic-web":Object.freeze({id:"cosmic-web",distanceScale:"hundreds of Mpc",defaultLevel:"D",datasets:["redshift surveys","topology reconstructions"],visibleObjectClasses:["catalog galaxies","groups","filaments","voids","density cells"],lod:"deterministic survey-mask-preserving samples",coordinateFrame:"observer-centered ICRS comoving",cameraLimits:"hundreds of Mpc",precisionDisclaimer:"representativeNotice"}),
    "observable-universe":Object.freeze({id:"observable-universe",distanceScale:"Mpc to Gpc past-light-cone context",defaultLevel:"D",datasets:["sparse catalog landmarks","cosmology-model horizons"],visibleObjectClasses:["catalog landmarks","model epochs","horizon guides"],lod:"sparse catalog plus model-derived representative guides",coordinateFrame:"observer-centered ICRS past light cone",cameraLimits:"Gpc context",precisionDisclaimer:"representativeNotice"}),
    cmb:Object.freeze({id:"cmb",distanceScale:"full celestial sphere",defaultLevel:"E",datasets:["authoritative CMB all-sky map product when deployed"],visibleObjectClasses:["observational sky pixels"],lod:"multi-resolution sky-map tiles",coordinateFrame:"celestial sphere projection",cameraLimits:"360-degree rotation",precisionDisclaimer:"skyMapNotice"})
  });
  const language=()=>global.PCSI18n?.getLanguage?.()||"en";
  const copy=(value=language())=>COPY[value]||COPY.en;
  const text=value=>String(value||"").toLowerCase();
  function categoryFor(record,levelId){
    const status=text(`${record?.dataStatus} ${record?.visualizationStatus} ${record?.objectType} ${record?.scientificDataCategory}`);
    if(levelId==="A"||status.includes("adopted-reference")||status.includes("reference anchor"))return "referenceAnchor";
    if(levelId==="B")return "catalogObservation";
    if(status.includes("representative")||status.includes("density tracer"))return "representativeDensityTracer";
    if(status.includes("reconstruction")||status.includes("model-derived")||status.includes("galactic structure")||status.includes("spiral arm"))return "reconstructedStructure";
    return "catalogObservation";
  }
  function levelFor(scaleContext,record){
    if(record?.scientificFidelityLevel&&LEVELS[record.scientificFidelityLevel])return record.scientificFidelityLevel;
    const status=text(`${record?.dataStatus} ${record?.visualizationStatus} ${record?.objectType}`);
    if(scaleContext==="solar")return "A";
    if(scaleContext==="nearby")return "B";
    if(scaleContext==="milky-way"){
      if(status.includes("catalog")||status.includes("measurement")||status.includes("astrometr")||record?.source_id||record?.sourceId&&record?.objectType!=="galactic structure")return "B";
      return "C";
    }
    if(["local-group","galaxy-groups","virgo"].includes(scaleContext)&&status.includes("catalog")&&!status.includes("reconstruction"))return "B";
    return CONTRACTS[scaleContext]?.defaultLevel||"D";
  }
  function classify({scaleContext="solar",record=null,language:requestedLanguage=language()}={}){
    const contract=CONTRACTS[scaleContext]||CONTRACTS.solar,level=LEVELS[levelFor(scaleContext,record)],localized=COPY[requestedLanguage]||COPY.en,categoryKey=categoryFor(record,level.id);
    return Object.freeze({level:level.id,canonicalName:level.canonicalName,label:localized[level.key],heading:localized.scientificFidelity,categoryKey,category:localized[categoryKey],disclaimer:localized[contract.precisionDisclaimer],scaleContext,contract});
  }
  function withModel(model,classification){return Object.freeze({...model,scientificFidelity:Object.freeze({...classification})});}
  global.PCSAstronomicalScientificFidelity=Object.freeze({LEVELS,COPY,CONTRACTS,copy,classify,withModel});
})(window);
