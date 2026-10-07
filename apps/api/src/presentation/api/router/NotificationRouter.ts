import { Router } from 'express';
import { z } from 'zod';
import {
  ManageNotificationTemplatesUseCase,
  ManageNotificationIntentsUseCase,
} from '@manaratak/application';
import {
  notificationIntentSchema,
  notificationTemplateSchema,
  parseStrict,
} from '../../validation/StrictControlPlaneSchemas.js';

export class NotificationRouter {
  public static create({
    templatesUseCase,
    intentsUseCase,
  }: {
    templatesUseCase: ManageNotificationTemplatesUseCase;
    intentsUseCase: ManageNotificationIntentsUseCase;
  }): Router {
    const router = Router();

    router.get('/templates', async (req, res, next) => {
      try {
        const rawLimit = Number(req.query.limit ?? 100);
        const limit = Number.isInteger(rawLimit) ? rawLimit : 100;
        res.json({ items: await templatesUseCase.listTemplates(limit) });
      } catch (error: any) {
        next(error);
      }
    });

    router.post('/templates', async (req, res, next) => {
      try {
        await templatesUseCase.createTemplate(parseStrict(notificationTemplateSchema, req.body), {
          createOnly: true,
        });
        res.status(201).json({ message: 'Template created successfully' });
      } catch (error: any) {
        next(error);
      }
    });

    router.get('/intents', async (req, res, next) => {
      try {
        const rawLimit = Number(req.query.limit ?? 100);
        const limit = Number.isInteger(rawLimit) ? rawLimit : 100;
        res.json({ items: await intentsUseCase.listIntents(limit) });
      } catch (error: any) {
        next(error);
      }
    });

    router.post('/intents/:id/retry', async (req, res, next) => {
      try {
        z.object({})
          .strict()
          .parse(req.body ?? {});
        await intentsUseCase.retryIntent(req.params.id);
        res.status(202).json({ message: 'Notification retry accepted' });
      } catch (error: any) {
        next(error);
      }
    });

    router.post('/intents/:id/cancel', async (req, res, next) => {
      try {
        z.object({})
          .strict()
          .parse(req.body ?? {});
        await intentsUseCase.cancelIntent(req.params.id);
        res.json({ message: 'Notification cancelled' });
      } catch (error) {
        next(error);
      }
    });

    router.post('/intents', async (req, res, next) => {
      try {
        const parsed = parseStrict(notificationIntentSchema, req.body);
        await intentsUseCase.createIntent({
          ...parsed,
          scheduledAt: parsed.scheduledAt ? new Date(parsed.scheduledAt) : undefined,
          expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : undefined,
        });
        res.status(201).json({ message: 'Intent created successfully' });
      } catch (error: any) {
        next(error);
      }
    });

    return router;
  }
}
