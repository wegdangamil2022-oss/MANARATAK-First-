// Consume observed committed events and end-to-end service probes; never backup age.
export function operationalRecoveryMetrics(input) {
  const {sourceEvents,recoveredEvents,checks,objectives}=input;
  const incident=Date.parse(input.incidentAt),verified=Date.parse(input.serviceVerifiedAt);
  if(!Number.isFinite(incident)||!Number.isFinite(verified)||verified<incident||
    !['databaseParity','assets','apiReadiness','webBrowser','adminBrowser','authenticatedRead'].every(key=>checks?.[key]===true)||
    ![objectives?.regionalLossRpoMinutes,objectives?.regionalLossRtoMinutes].every(v=>Number.isFinite(v)&&v>=0))
    throw Error('RECOVERY_SERVICE_MEASUREMENT_INVALID');
  if(!Array.isArray(sourceEvents)||!sourceEvents.length||!Array.isArray(recoveredEvents)||!recoveredEvents.length||
    new Set(sourceEvents.map(e=>e.id)).size!==sourceEvents.length||new Set(recoveredEvents.map(e=>e.id)).size!==recoveredEvents.length)
    throw Error('RECOVERY_EVENT_PARITY_INVALID');
  let previous=-Infinity;
  for(const event of sourceEvents){
    const timestamp=Date.parse(event.committedAt);
    if(typeof event.id!=='string'||!event.id||!/^[0-9a-f]{64}$/.test(event.sha256)||!Number.isFinite(timestamp)||timestamp<previous||timestamp>incident)
      throw Error('RECOVERY_EVENT_PARITY_INVALID');
    previous=timestamp;
  }
  const recovered=new Map(recoveredEvents.map(e=>[e.id,e.sha256]));
  let gap=false,last;
  const lost=[];
  for(const event of sourceEvents){
    if(!recovered.has(event.id)){gap=true;lost.push(event.id);continue;}
    if(gap||recovered.get(event.id)!==event.sha256)throw Error('RECOVERY_EVENT_PARITY_INVALID');
    last=event;
  }
  if(!last||recovered.size!==sourceEvents.length-lost.length)throw Error('RECOVERY_EVENT_PARITY_INVALID');
  const rpoSeconds=lost.length?(incident-Date.parse(last.committedAt))/1000:0,rtoSeconds=(verified-incident)/1000;
  return {kind:'LOCAL_OBSERVED_OPERATIONAL_RECOVERY',status:rpoSeconds<=objectives.regionalLossRpoMinutes*60&&rtoSeconds<=objectives.regionalLossRtoMinutes*60?'PASS':'FAIL',
    incidentAt:input.incidentAt,serviceVerifiedAt:input.serviceVerifiedAt,lastRecoveredEventId:last.id,lastRecoveredCommittedAt:last.committedAt,
    sourceEventCount:sourceEvents.length,recoveredEventCount:recovered.size,lostEventCount:lost.length,lostEventIds:lost,
    rpoSeconds,rtoSeconds,rpoMeasurementBasis:'OBSERVED_COMMITTED_EVENT_PREFIX',integratedServiceRtoMeasured:true,
    scope:'LOCAL_SYNTHETIC_LOOPBACK',regionalLossMeasured:false,productionAcceptance:false};
}
