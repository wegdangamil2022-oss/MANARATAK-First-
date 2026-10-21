import fs from 'node:fs';import path from 'node:path';
import {PrismaClient} from './r07-filtered/node_modules/@prisma/client/default.js';
import {PrismaServicePlatformRepository} from './r07-filtered/packages/infrastructure/src/services-platform/PrismaServicePlatformRepository.ts';
const lab=path.resolve(process.argv[2]),env=Object.fromEntries(fs.readFileSync(path.join(lab,'lab.env'),'utf8').trim().split(/\r?\n/).map(s=>{const i=s.indexOf('=');return[s.slice(0,i),s.slice(i+1)];}));
const db=new PrismaClient({datasources:{db:{url:env.DATABASE_URL}},errorFormat:'minimal'});
try{const r=await new PrismaServicePlatformRepository(db).listPublished({limit:20,locale:'ar'});console.log(JSON.stringify({passed:true,total:r.total}));}catch(e){console.log(JSON.stringify({passed:false,code:e.code,meta:e.meta,message:e.message}));process.exitCode=1;}finally{await db.$disconnect();}
