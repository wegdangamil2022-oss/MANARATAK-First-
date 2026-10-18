import {PrismaClient} from '@prisma/client';
import {runWorker} from './post28-import-worker-runtime.mjs';
if(process.env.POST28_DATABASE_SUITE!=='import-worker-crash'||process.env.POST28_TARGET_LABEL!=='DB-T'||process.env.POST28_TRANSACTION_SETUP_URL)throw Error('POST28_DB_T_RUNNER_REQUIRED');
const db=new PrismaClient({log:[],errorFormat:'minimal'});
try{await runWorker(db,process.argv[2],point=>process.send?.({point}));}
finally{await db.$disconnect();}
