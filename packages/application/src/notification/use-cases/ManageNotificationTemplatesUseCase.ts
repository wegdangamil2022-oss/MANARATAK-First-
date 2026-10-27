import {
  INotificationTemplateRepository,
  NotificationTemplateSummary,
  NotificationTemplateQuery,
} from '@manaratak/domain';
import { NotificationTemplate } from '@manaratak/domain';
import { TemplateId } from '@manaratak/domain';
import { NotificationChannel } from '@manaratak/domain';
import { NotificationLocaleReference } from '@manaratak/domain';
import { CreateTemplateDto } from '../dtos/NotificationDtos';

export class ManageNotificationTemplatesUseCase {
  constructor(private readonly templateRepository: INotificationTemplateRepository) {}

  public async createTemplate(
    dto: CreateTemplateDto,
    options?: { createOnly?: boolean },
  ): Promise<void> {
    if (
      !dto.channels.length ||
      dto.channels.some((channel) => !['IN_APP', 'EMAIL', 'PUSH'].includes(channel.toUpperCase()))
    )
      throw new Error('NOTIFICATION_CHANNEL_NOT_APPROVED');
    if (
      !dto.localizations.length ||
      new Set(dto.localizations).size !== dto.localizations.length ||
      dto.localizations.some((locale) => !['ar', 'en'].includes(locale))
    )
      throw new Error('NOTIFICATION_LOCALE_NOT_SUPPORTED');
    if (
      dto.requiredVariables.length > 40 ||
      new Set(dto.requiredVariables).size !== dto.requiredVariables.length ||
      dto.requiredVariables.some(
        (name) =>
          !/^[a-zA-Z][a-zA-Z0-9_]{0,119}$/.test(name) ||
          /password|token|secret|authorization|email|phone/i.test(name),
      ) ||
      new Set(dto.channels.map((c) => c.toUpperCase())).size !== dto.channels.length
    )
      throw new Error('NOTIFICATION_TEMPLATE_VARIABLES_OR_CHANNELS_INVALID');
    if (dto.contents) {
      for (const locale of dto.localizations) {
        const content = dto.contents[locale];
        if (
          !content ||
          !content.subject.trim() ||
          !content.body.trim() ||
          content.subject.length > 240 ||
          content.body.length > 10000
        )
          throw new Error('NOTIFICATION_TEMPLATE_CONTENT_INVALID');
        const text = content.subject + content.body;
        for (const match of text.matchAll(/\{\{([a-zA-Z][a-zA-Z0-9_]*)\}\}/g))
          if (!dto.requiredVariables.includes(match[1]))
            throw new Error('NOTIFICATION_TEMPLATE_VARIABLE_UNDECLARED');
        if (/\{\{|\}\}/.test(text.replace(/\{\{([a-zA-Z][a-zA-Z0-9_]*)\}\}/g, '')))
          throw new Error('NOTIFICATION_TEMPLATE_CONTENT_INVALID');
        if (/[<>]/.test(text)) throw new Error('NOTIFICATION_TEMPLATE_HTML_NOT_ALLOWED');
      }
    }
    const templateId = TemplateId.create(dto.id);
    const channels = dto.channels.map((c) => NotificationChannel.create(c));
    const localizations = dto.localizations.map((l) => NotificationLocaleReference.create(l));

    const template = NotificationTemplate.create(
      templateId,
      channels,
      dto.requiredVariables,
      localizations,
      dto.contents,
    );

    await this.templateRepository.save(template, options);
  }

  public async cloneTemplate(id: string, newId: string): Promise<void> {
    if (newId.startsWith('system.') || newId.startsWith('student-application-'))
      throw new Error('NOTIFICATION_OWNER_TEMPLATE_RESERVED');
    const source = await this.templateRepository.findById(TemplateId.create(id));
    if (!source?.contents) throw new Error('NOTIFICATION_TEMPLATE_CONTENT_REQUIRED');
    await this.createTemplate(
      {
        id: newId,
        channels: source.channels.map(String),
        requiredVariables: [...source.requiredVariables],
        localizations: source.localizations.map(String),
        contents: source.contents,
      },
      { createOnly: true },
    );
  }

  public async deactivateTemplate(id: string, expectedVersion: number): Promise<void> {
    if (id.startsWith('system.') || id.startsWith('student-application-'))
      throw new Error('NOTIFICATION_OWNER_TEMPLATE_RESERVED');
    return this.templateRepository.deactivate(id, expectedVersion);
  }

  public async preview(id: string, variables: Record<string, string>, locale: string) {
    const template = await this.templateRepository.findById(TemplateId.create(id));
    if (!template) throw new Error('NOTIFICATION_TEMPLATE_NOT_FOUND');
    for (const name of template.requiredVariables)
      if (!variables[name]?.trim()) throw new Error('NOTIFICATION_REQUIRED_VARIABLE_MISSING');
    if (Object.keys(variables).some((name) => !template.requiredVariables.includes(name)))
      throw new Error('NOTIFICATION_VARIABLES_NOT_ALLOWED');
    const selected = template.contents?.[locale]
      ? locale
      : template.contents?.en
        ? 'en'
        : template.contents?.ar
          ? 'ar'
          : undefined;
    const content = selected ? template.contents![selected] : undefined;
    if (!content) throw new Error('NOTIFICATION_TEMPLATE_PREVIEW_NOT_AVAILABLE');
    const render = (text: string) =>
      text.replace(/\{\{([a-zA-Z][a-zA-Z0-9_]*)\}\}/g, (_match, name: string) => variables[name]);
    return {
      title: render(content.subject),
      message: render(content.body),
      locale: selected,
      fallback: selected !== locale,
    };
  }
  public async detail(id: string) {
    const detail = await this.templateRepository.detail(id);
    if (!detail) throw new Error('NOTIFICATION_TEMPLATE_NOT_FOUND');
    return detail;
  }

  public async ensureTemplate(dto: CreateTemplateDto): Promise<void> {
    await this.createTemplate(dto);
  }

  public listTemplates(
    limit = 100,
    query?: NotificationTemplateQuery,
  ): Promise<NotificationTemplateSummary[]> {
    return this.templateRepository.list(Math.max(1, Math.min(limit, 501)), query);
  }
}
