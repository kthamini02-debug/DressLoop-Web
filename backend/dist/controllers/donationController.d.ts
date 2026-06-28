import { Request, Response } from 'express';
export declare function createDonation(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function getMyDonations(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function getDonationById(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function updateDonation(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function deleteDonation(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function browseDonations(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
