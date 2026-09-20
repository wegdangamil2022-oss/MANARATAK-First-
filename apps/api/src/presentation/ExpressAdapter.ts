import { Request, Response } from 'express';
import { IController } from '@manaratak/core';

export class ExpressAdapter {
  public static adapt(controller: IController<any, any>) {
    return async (req: Request, res: Response) => {
      try {
        const response = await controller.execute(req);
        // Assuming the controller returns an object with statusCode and body
        if (response && response.statusCode) {
          return res.status(response.statusCode).json(response.body);
        }
        return res.status(200).json(response);
      } catch {
        return res.status(500).json({ message: 'An unexpected error occurred' });
      }
    };
  }
}
