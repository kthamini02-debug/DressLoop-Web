import { Request, Response } from 'express';
export declare function getMessages(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function sendMessage(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function getChatPartners(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
