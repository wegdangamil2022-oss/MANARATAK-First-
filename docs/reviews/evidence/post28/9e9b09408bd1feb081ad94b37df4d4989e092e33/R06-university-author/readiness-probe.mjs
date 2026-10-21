import fs from 'node:fs';
import path from 'node:path';
import {PrismaClient} from './r06-runtime/node_modules/@prisma/client/default.js';
import {PrismaUniversityRepository} from './r06-runtime/packages/infrastructure/src/universities/PrismaUniversityRepository.ts';
import {AdminUniversityUseCases} from './r06-runtime/packages/application/src/universities/use-cases/AdminUniversityUseCases.ts';
const lab=path.resolve(process.argv[2]),state=JSON.parse(fs.readFileSync(path.join(lab,'lab-state.json')));
if(state.profile!=='transactions'||path.resolve(state.directory)!==lab||!lab.startsWith(path.resolve('..')+path.sep))throw Error('OWN_LAB_REQUIRED');
const env=Object.fromEntries(fs.readFileSync(path.join(lab,'lab.env'),'utf8').trim().split(/\r?\n/).map(s=>{const i=s.indexOf('=');return [s.slice(0,i),s.slice(i+1)];}));
const url=new URL(env.DATABASE_URL);if(url.hostname!=='127.0.0.1'||Number(url.port)!==state.port||url.username!=='post28_app'||decodeURIComponent(url.pathname.slice(1))!=='manaratak_post28_transactions_test')throw Error('LAB_TARGET_MISMATCH');
const db=new PrismaClient({datasources:{db:{url:env.DATABASE_URL}},log:[],errorFormat:'minimal'});
try{await db.$transaction(async tx=>{await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');const [who]=await tx.$queryRaw`SELECT current_user AS role`;if(who.role!=='post28_app')throw Error('APP_ROLE_REQUIRED');const rows=await tx.university.findMany({where:{displayName:{startsWith:'Synthetic authored institution '},completenessStatus:'COMPLETE'},select:{id:true,publicId:true},take:10});const commands=new AdminUniversityUseCases(new PrismaUniversityRepository(tx));for(const row of rows)console.log(JSON.stringify({...row,sourceSha:state.sourceSha,readOnly:true,readiness:await commands.checkPublicationReadiness(row.id)}));});}finally{await db.$disconnect();}
