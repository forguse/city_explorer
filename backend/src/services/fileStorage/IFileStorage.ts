
export interface IUploadResult {
    url: string;
    path: string; // Storage path/key for future migration
    filename: string;
    mimetype: string;
    size: number;
}

export interface IFileStorageService {
    upload(file: Express.Multer.File, folder?: string): Promise<IUploadResult>;
    delete(path: string): Promise<void>;
}
