import { Request, Response } from 'express';
export declare function getDashboardStats(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function getNgos(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function verifyNgo(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function getUsers(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function deleteUser(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function getDonations(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function deleteDonation(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
