import {randomUUID} from 'node:crypto';

/** Synthetic canonical publication prerequisite; no historical owner is repaired. */
export async function syntheticUniversityCountry(db){
  for(let index=0;index<676;index++){
    const code=String.fromCharCode(65+Math.floor(index/26))+String.fromCharCode(65+index%26);
    if(await db.referenceCountry.findUnique({where:{iso2Code:code}}))continue;
    const row=await db.referenceCountry.create({data:{id:randomUUID(),iso2Code:code,iso3Code:'Z'+code,name:'Synthetic University publication country',isActive:true,lifecycleState:'ACTIVE'}});
    return row.id;
  }
  throw new Error('SYNTHETIC_COUNTRY_NAMESPACE_EXHAUSTED');
}
