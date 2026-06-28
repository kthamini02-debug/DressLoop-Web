import multer from 'multer';
export declare const upload: multer.Multer;
/**
 * Uploads a local file (multer upload result) to Cloudinary if configured.
 * If Cloudinary is not configured, returns the local static server URL.
 */
export declare function processUpload(file: Express.Multer.File): Promise<string>;
