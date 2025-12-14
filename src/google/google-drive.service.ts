import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';
import { GoogleAuthService } from './google-auth.service';
import { Readable } from 'stream';

@Injectable()
export class GoogleDriveService {
    constructor(private readonly googleAuthService: GoogleAuthService) { }

    private get drive() {
        return google.drive({ version: 'v3', auth: this.googleAuthService.getClient() });
    }

    async folderNameExists(parentId: string, folderName: string): Promise<boolean> {
        const res = await this.drive.files.list({
            q: `'${parentId}' in parents and name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
            fields: 'files(id, name)',
        });

        if (!res.data.files) return false;
        return res.data.files.length > 0;
    }

    async createFolder(parentId: string, folderName: string): Promise<string> {
        const fileMetadata = {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [parentId],
        };

        const res = await this.drive.files.create({
            requestBody: fileMetadata,
            fields: 'id',
            supportsAllDrives: true,
        });

        return res.data.id!;
    }

    async getOrCreateFolder(parentId: string, folderName: string): Promise<string> {
        const exists = await this.folderNameExists(parentId, folderName);

        if (exists) {
            const res = await this.drive.files.list({
                q: `'${parentId}' in parents and name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
                fields: 'files(id, name)',
                includeItemsFromAllDrives: true,
                supportsAllDrives: true,
            });
            return res.data.files![0].id!;
        }

        return this.createFolder(parentId, folderName);
    }

    async uploadTextFile(folderId: string, fileName: string, mimeType: string, content: string): Promise<string> {
        const fileMetadata = {
            name: fileName,
            parents: [folderId],
        };

        const media = {
            mimeType: mimeType,
            body: Readable.from(content),
        };

        const res = await this.drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id',
            supportsAllDrives: true,
        });

        return res.data.id!;
    }

    async listFilesInFolder(folderId: string): Promise<{ id: string; name: string }[]> {
        const res = await this.drive.files.list({
            q: `'${folderId}' in parents and trashed=false`,
            fields: 'files(id, name)',
            includeItemsFromAllDrives: true,
            supportsAllDrives: true,
            corpora: 'allDrives',
        });

        return res.data.files!.map(file => ({ id: file.id!, name: file.name! }));
    }
}
