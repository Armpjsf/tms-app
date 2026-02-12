import { google } from 'googleapis'
import { join } from 'path'

// Load credentials from file
const KEY_FILE_PATH = join(process.cwd(), 'service_account.json')

// Scopes for Drive API
const SCOPES = ['https://www.googleapis.com/auth/drive.file']

// Rate limiting / Concurrency control could be added here if needed
// For now, simple initialization

export async function getDriveClient() {
  const auth = new google.auth.GoogleAuth({
    keyFile: KEY_FILE_PATH,
    scopes: SCOPES,
  })

  return google.drive({ version: 'v3', auth })
}

// Cache folder ID to avoid repeated lookups
const folderIdCache: Record<string, string> = {}

export async function getOrCreateFolder(folderName: string, parentId?: string): Promise<string> {
    const drive = await getDriveClient()
    const cacheKey = `${folderName}-${parentId || 'root'}`
    
    if (folderIdCache[cacheKey]) return folderIdCache[cacheKey]

    // Check if folder exists
    let query = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`
    if (parentId) {
        query += ` and '${parentId}' in parents`
    }

    const res = await drive.files.list({
        q: query,
        fields: 'files(id, name)',
        spaces: 'drive',
    })

    if (res.data.files && res.data.files.length > 0) {
        const id = res.data.files[0].id!
        folderIdCache[cacheKey] = id
        return id
    }

    // Create folder if not exists
    const fileMetadata: { name: string; mimeType: string; parents?: string[] } = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
    }
    if (parentId) {
        fileMetadata.parents = [parentId]
    }

    const file = await drive.files.create({
        requestBody: fileMetadata,
        fields: 'id',
    })

    const id = file.data.id!
    folderIdCache[cacheKey] = id
    return id
}

export async function uploadFileToDrive(
    fileBuffer: Buffer, 
    fileName: string, 
    mimeType: string,
    folderName: string = 'TMS_Uploads'
) {
    try {
        const drive = await getDriveClient()
        
        // 1. Get or Create "TMS_App_Data" root folder to keep things tidy
        const rootFolderId = await getOrCreateFolder('TMS_App_Data')
        
        // 2. Get or Create specific subfolder (e.g. "Maintenance", "Fuel", "POD")
        const targetFolderId = await getOrCreateFolder(folderName, rootFolderId)

        // 3. Upload file
        const media = {
            mimeType,
            body: Readable.from(fileBuffer),
        }

        const res = await drive.files.create({
            requestBody: {
                name: fileName,
                parents: [targetFolderId],
            },
            media: media,
            fields: 'id, webViewLink, webContentLink, thumbnailLink',
        })

        // 4. Make it readable by anyone with the link (Optional: or restrict to organization)
        // For this use case, we probably need it public or at least accessible to the app users.
        // Granting 'reader' permission to 'anyone' makes it publicly accessible via link.
        await drive.permissions.create({
            fileId: res.data.id!,
            requestBody: {
                role: 'reader',
                type: 'anyone',
            },
        })

        return {
            fileId: res.data.id,
            webViewLink: res.data.webViewLink, // View in Drive
            webContentLink: res.data.webContentLink, // Direct download
            // Unofficial direct link format often used for standard img tags (beware quotas)
            // https://drive.google.com/uc?export=view&id=FILE_ID
            directLink: `https://drive.google.com/uc?export=view&id=${res.data.id}` 
        }

    } catch (error) {
        console.error('Google Drive Upload Error:', error)
        throw error
    }
}

import { Readable } from 'stream'
