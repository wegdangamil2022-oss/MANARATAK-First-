import { Router, Request, Response } from 'express';
import { ManageFilesUseCase } from '@manaratak/application';
import { ResponseFormatter } from '../response/ResponseFormatter.js';
import {
  fileActivateSchema,
  fileIdParamSchema,
  fileRegisterSchema,
  fileUploadLocatorSchema,
  parseStrict,
} from '../../validation/StrictControlPlaneSchemas.js';

export class FileManagementRouter {
  public static create({ manageFilesUseCase }: { manageFilesUseCase: ManageFilesUseCase }): Router {
    const router = Router();
    const responseFormatter = new ResponseFormatter('v1');
    const useCase = manageFilesUseCase;

    router.post('/upload-locator', async (req: Request, res: Response) => {
      try {
        const locator = await useCase.generateUploadLocator(parseStrict(fileUploadLocatorSchema, req.body));
        res.status(200).json(responseFormatter.success({ locator }));
      } catch {
        res.status(400).json(responseFormatter.error({ code: 'VALIDATION_ERROR', message: 'File request is invalid' }));
      }
    });

    router.post('/register', async (req: Request, res: Response) => {
      try {
        const parsed = parseStrict(fileRegisterSchema, req.body);
        await useCase.registerFile({
          ...parsed,
          expiresAt: parsed.expiresAt instanceof Date ? parsed.expiresAt : parsed.expiresAt ? new Date(parsed.expiresAt) : undefined,
        });
        res.status(201).json(responseFormatter.success({ message: 'File registered successfully' }));
      } catch {
        res.status(400).json(responseFormatter.error({ code: 'VALIDATION_ERROR', message: 'File request is invalid' }));
      }
    });

    router.post('/:fileId/activate', async (req: Request, res: Response) => {
      try {
        const { fileId } = parseStrict(fileIdParamSchema, req.params);
        const payload = parseStrict(fileActivateSchema, req.body);
        await useCase.activateFile({ ...payload, fileId });
        res.status(200).json(responseFormatter.success({ message: 'File activated successfully' }));
      } catch {
        res.status(400).json(responseFormatter.error({ code: 'VALIDATION_ERROR', message: 'File request is invalid' }));
      }
    });

    router.post('/:fileId/archive', async (req: Request, res: Response) => {
      try {
        const { fileId } = parseStrict(fileIdParamSchema, req.params);
        await useCase.archiveFile({ fileId });
        res.status(200).json(responseFormatter.success({ message: 'File archived successfully' }));
      } catch {
        res.status(400).json(responseFormatter.error({ code: 'VALIDATION_ERROR', message: 'File request is invalid' }));
      }
    });

    router.delete('/:fileId', async (req: Request, res: Response) => {
      try {
        const { fileId } = parseStrict(fileIdParamSchema, req.params);
        await useCase.softDeleteFile({ fileId });
        res.status(200).json(responseFormatter.success({ message: 'File soft deleted successfully' }));
      } catch {
        res.status(400).json(responseFormatter.error({ code: 'VALIDATION_ERROR', message: 'File request is invalid' }));
      }
    });

    router.post('/:fileId/restore', async (req: Request, res: Response) => {
      try {
        const { fileId } = parseStrict(fileIdParamSchema, req.params);
        await useCase.restoreFile({ fileId });
        res.status(200).json(responseFormatter.success({ message: 'File restored successfully' }));
      } catch {
        res.status(400).json(responseFormatter.error({ code: 'VALIDATION_ERROR', message: 'File request is invalid' }));
      }
    });

    return router;
  }
}
