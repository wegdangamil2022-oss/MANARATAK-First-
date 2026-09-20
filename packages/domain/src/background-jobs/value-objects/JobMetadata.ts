import { JobPriority } from './JobPriority';
import { JobScheduleMetadata } from './JobScheduleMetadata';
import { JobExecutionPolicy } from './JobExecutionPolicy';
import { JobRetryPolicy } from './JobRetryPolicy';

export class JobMetadata {
  private constructor(
    private readonly priority: JobPriority,
    private readonly schedule: JobScheduleMetadata,
    private readonly executionPolicy: JobExecutionPolicy,
    private readonly retryPolicy: JobRetryPolicy
  ) {}

  public static create(
    priority: JobPriority,
    schedule: JobScheduleMetadata,
    executionPolicy: JobExecutionPolicy,
    retryPolicy: JobRetryPolicy
  ): JobMetadata {
    return new JobMetadata(priority, schedule, executionPolicy, retryPolicy);
  }

  public getPriority(): JobPriority {
    return this.priority;
  }

  public getSchedule(): JobScheduleMetadata {
    return this.schedule;
  }

  public getExecutionPolicy(): JobExecutionPolicy {
    return this.executionPolicy;
  }

  public getRetryPolicy(): JobRetryPolicy {
    return this.retryPolicy;
  }
}
