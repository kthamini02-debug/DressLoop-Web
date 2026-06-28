import { Request, Response, NextFunction } from 'express';
export declare function roleMiddleware(allowedRoles: ('donor' | 'ngo' | 'admin')[]): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
