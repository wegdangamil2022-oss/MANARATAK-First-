import { INotificationTemplateRepository, NotificationTemplateSummary } from '@manaratak/domain';
import { NotificationTemplate } from '@manaratak/domain';
import { TemplateId } from '@manaratak/domain';
import { NotificationChannel } from '@manaratak/domain';
import { NotificationLocaleReference } from '@manaratak/domain';
import { CreateTemplateDto } from '../dtos/NotificationDtos';

export class ManageNotificationTemplatesUseCase {
  constructor(private readonly templateRepository: INotificationTemplateRepository) {}

  public async createTemplate(dto: CreateTemplateDto): Promise<void> {
    const templateId = TemplateId.create(dto.id);
    const channels = dto.channels.map(c => NotificationChannel.create(c));
    const localizations = dto.localizations.map(l => NotificationLocaleReference.create(l));
    
    const template = NotificationTemplate.create(
      templateId,
      channels,
      dto.requiredVariables,
      localizations
    );

    await this.templateRepository.save(template);
  }

  public listTemplates(limit = 100): Promise<NotificationTemplateSummary[]> {
    return this.templateRepository.list(Math.max(1, Math.min(limit, 500)));
  }
}
