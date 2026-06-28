import { Request, Response } from 'express';
export declare function register(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function login(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function getMe(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function updateProfile(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
