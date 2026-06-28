import { Request, Response } from 'express';
export declare function createRequest(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function getMyRequests(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function getRequestsByDonation(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function updateRequestStatus(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
