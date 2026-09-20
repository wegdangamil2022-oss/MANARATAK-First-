import { IStudentApplicationReminderGateway } from '@manaratak/domain';
import { ManageNotificationIntentsUseCase } from '../../notification/use-cases/ManageNotificationIntentsUseCase';
import { ManageNotificationTemplatesUseCase } from '../../notification/use-cases/ManageNotificationTemplatesUseCase';

export class StudentApplicationReminderNotificationGateway implements IStudentApplicationReminderGateway {
  constructor(private readonly intents:ManageNotificationIntentsUseCase, private readonly templates:ManageNotificationTemplatesUseCase) {}
  private id(trackerId:string,version:number){ return `student-application-deadline-${trackerId}-v${version}`; }
  async schedule(input:{trackerId:string;trackerVersion:number;studentReferenceId:string;scholarshipId:string;deadlineAt:Date}){
    const scheduledAt=new Date(input.deadlineAt.getTime()-3*24*60*60*1000); if(scheduledAt.getTime()<=Date.now()) return;
    await this.templates.createTemplate({id:'student-application-deadline-v1',channels:['IN_APP','EMAIL'],requiredVariables:['scholarshipId','deadlineAt'],localizations:['ar','en']});
    await this.intents.createIntent({id:this.id(input.trackerId,input.trackerVersion),reference:`student-application:${input.trackerId}`,templateId:'student-application-deadline-v1',recipientReference:input.studentReferenceId,variables:{scholarshipId:input.scholarshipId,deadlineAt:input.deadlineAt.toISOString()},scheduledAt,expiresAt:input.deadlineAt,retryMaxRetries:5,retryBackoffMs:60000});
  }
  async cancel(trackerId:string,trackerVersion:number){ await this.intents.cancelIntent(this.id(trackerId,trackerVersion)).catch(()=>undefined); }
}
