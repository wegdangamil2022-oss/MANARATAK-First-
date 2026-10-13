import type {IReferenceDataRepository} from '@manaratak/domain';
import {AssetSecurityClassification} from '@manaratak/domain';
import {AssetReferencePolicy} from '../asset-platform/AssetReferencePolicy';
import type {ProcessAssetLifecycleUseCase} from '../asset-platform/use-cases/ProcessAssetLifecycleUseCase';
export class StudyDestinationPublicEnrichment {
 constructor(private readonly references:IReferenceDataRepository,private readonly assets:AssetReferencePolicy,private readonly delivery:ProcessAssetLifecycleUseCase){}
 async image(assetId?:string|null):Promise<{url:string;expiresAt:string}|null>{
  if(!assetId)return null;
  try{await this.assets.assertUsable(assetId,{purpose:'STUDY_DESTINATION_IMAGE',publicPublication:true,allowedClassifications:[AssetSecurityClassification.PUBLIC],allowedMimeTypePrefixes:['image/']});const grant=await this.delivery.requestDeliveryGrant({assetId,expiresInSeconds:300,browserCompatible:true});const url=new URL(grant.url);if(url.protocol!=='https:'||url.username||url.password||Object.keys(grant.headers).length||Date.parse(grant.expiresAt)<=Date.now())return null;return {url:grant.url,expiresAt:grant.expiresAt};}catch{return null;}
 }
 async cities(countryIso2Code:string,page=1){
  const filters={countryIso2Code,activeOnly:true,page,pageSize:20};
  const [rows,total]=await Promise.all([this.references.listCities(filters),this.references.countRecords('cities',filters)]);
  return {data:rows.map(row=>({id:row.id,name:row.name,nameAr:row.nameAr??null})),total,page,pageSize:20,totalPages:Math.ceil(total/20)};
 }
}
