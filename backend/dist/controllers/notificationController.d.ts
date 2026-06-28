import { Request, Response } from 'express';
export declare function getNotifications(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function markAsRead(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
