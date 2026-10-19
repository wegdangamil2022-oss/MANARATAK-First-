import {once} from 'node:events';
import {createHmac} from 'node:crypto';
import express from 'express';
import {PrismaClient} from '@prisma/client';
import {JwtTokenProvider} from '../../../packages/infrastructure/src/auth/JwtTokenProvider.ts';
import {PrismaSessionManager} from '../../../packages/infrastructure/src/auth/PrismaSessionManager.ts';
import {PrismaCredentialVerifier} from '../../../packages/infrastructure/src/auth/PrismaCredentialVerifier.ts';
import {PrismaIdentityRepository} from '../../../packages/infrastructure/src/identity/PrismaIdentityRepository.ts';
import {IdentityPrincipalAccessValidator} from '../../../packages/application/src/auth/IdentityPrincipalAccessValidator.ts';
import {AuthService} from '../../../packages/application/src/auth/AuthService.ts';
import {SecurityService} from '../../../packages/infrastructure/src/security/SecurityService.ts';
import {AuthRouter} from '../../../apps/api/src/presentation/api/router/AuthRouter.ts';
import {AuthMiddleware} from '../../../apps/api/src/presentation/middleware/AuthMiddleware.ts';
import {SecurityMiddlewareFactory} from '../../../apps/api/src/presentation/security/SecurityMiddlewareFactory.ts';
if(!process.send||process.env.POST28_DATABASE_SUITE!=='r08-session-processes'||process.env.POST28_TARGET_LABEL!=='DB-T'||process.env.POST28_TRANSACTION_SETUP_URL)throw Error('POST28_DB_T_RUNNER_REQUIRED');
const configuration=once(process,'message');process.send({point:'WAITING_CONFIG'});
const [config]=await configuration;
const db=new PrismaClient({log:[],errorFormat:'minimal'});let server;
try{
  if((await db.$queryRaw`SELECT current_user AS role`)[0].role!=='post28_app')throw Error('POST28_APP_REQUIRED');
  const identities=new PrismaIdentityRepository(db),sessions=new PrismaSessionManager(db),tokens=new JwtTokenProvider(config.keys),principal=new IdentityPrincipalAccessValidator(identities),credentials=new PrismaCredentialVerifier(db);
  // Real local fixed-window limiter only; distributed Redis has separate Linux evidence.
  const security=new SecurityService(undefined,{signingSecret:config.csrf});
  const auth=new AuthService(tokens,sessions,principal,credentials),app=express();app.use(express.json());
  app.use(SecurityMiddlewareFactory.createCsrfGuard(security,{allowedOrigins:['https://web.example.invalid']}));
  const unavailable={execute:async()=>{throw Error('R08_UNEXERCISED_ROUTE');}};
  app.use('/api/v1/auth',AuthRouter.create({authService:auth,identityRepository:identities,securityService:security,tokenProvider:tokens,sessionManager:sessions,principalAccessValidator:principal,credentialVerifier:credentials,forgotPasswordUseCase:unavailable,resetPasswordUseCase:unavailable,authRateLimitKey:value=>createHmac('sha256',config.csrf).update(value).digest('hex')}));
  app.get('/api/v1/private',new AuthMiddleware(tokens,sessions,principal).generate(),(req,res)=>res.json({userId:req.authUserId}));
  app.use((_error,_req,res,_next)=>res.status(500).json({error:'R08_REQUEST_FAILED'}));
  server=app.listen(0,'127.0.0.1');await once(server,'listening');process.send({point:'READY',port:server.address().port});
  await new Promise(resolve=>process.on('message',message=>{if(message==='STOP')resolve();}));
}catch{console.error('R08_SESSION_SERVER_FAILED');process.exitCode=1;}
finally{if(server)await new Promise(resolve=>server.close(resolve));await db.$disconnect();process.disconnect?.();}
