import {Prisma} from '@prisma/client';

/** Canonical country is mandatory under University publication policy. Optional
 * region/city pointers, when present, must still reference active records.
 */
export function publicUniversityEligibility(): Prisma.UniversityWhereInput {
  return {
    status:'PUBLISHED',
    countryReference:{is:{isActive:true,lifecycleState:'ACTIVE'}},
    AND:[
      {OR:[{regionReferenceId:null},{regionReference:{is:{isActive:true,lifecycleState:'ACTIVE'}}}]},
      {OR:[{cityReferenceId:null},{cityReference:{is:{isActive:true,lifecycleState:'ACTIVE'}}}]},
    ],
  };
}

export const publicUniversityGeographySelect={
  status:true,countryReference:{select:{isActive:true,lifecycleState:true}},
  regionReferenceId:true,regionReference:{select:{isActive:true,lifecycleState:true}},
  cityReferenceId:true,cityReference:{select:{isActive:true,lifecycleState:true}},
} satisfies Prisma.UniversitySelect;

export function isPublicUniversityGeography(value:{
  status:string;countryReference:{isActive:boolean;lifecycleState:string}|null;
  regionReferenceId:string|null;regionReference:{isActive:boolean;lifecycleState:string}|null;
  cityReferenceId:string|null;cityReference:{isActive:boolean;lifecycleState:string}|null;
}):boolean {
  return value.status==='PUBLISHED' && value.countryReference?.isActive===true && value.countryReference.lifecycleState==='ACTIVE'
    && (!value.regionReferenceId||(value.regionReference?.isActive===true&&value.regionReference.lifecycleState==='ACTIVE'))
    && (!value.cityReferenceId||(value.cityReference?.isActive===true&&value.cityReference.lifecycleState==='ACTIVE'));
}

export function publicUniversityGeographySql(): Prisma.Sql {
  return Prisma.sql`EXISTS(SELECT 1 FROM "ReferenceCountry" c WHERE c.id=u."countryReferenceId" AND c."isActive"=true AND c."lifecycleState"='ACTIVE')
    AND (u."regionReferenceId" IS NULL OR EXISTS(SELECT 1 FROM "AdministrativeRegion" r WHERE r.id=u."regionReferenceId" AND r."isActive"=true AND r."lifecycleState"='ACTIVE'))
    AND (u."cityReferenceId" IS NULL OR EXISTS(SELECT 1 FROM "ReferenceCity" c WHERE c.id=u."cityReferenceId" AND c."isActive"=true AND c."lifecycleState"='ACTIVE'))`;
}
