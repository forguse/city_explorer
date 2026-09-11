
import { IFileStorageService } from './IFileStorage';
import { LocalStorageService } from './LocalStorageService';

// OSS Service stub - can be implemented later
class OssStorageService implements IFileStorageService {
    async upload(file: Express.Multer.File, folder?: string): Promise<any> {
        throw new Error("OSS Storage not implemented yet");
    }
    async delete(path: string): Promise<void> {
        throw new Error("OSS Storage not implemented yet");
    }
}

export class StorageFactory {
    private static instance: IFileStorageService;

    static getService(): IFileStorageService {
        if (!this.instance) {
            const type = process.env.STORAGE_TYPE || 'local';

            switch (type) {
                case 'oss':
                    this.instance = new OssStorageService();
                    break;
                case 'local':
                default:
                    this.instance = new LocalStorageService();
                    break;
            }
        }
        return this.instance;
    }
}
