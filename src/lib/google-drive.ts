import { google } from 'googleapis'
import { join } from 'path'
import { Readable } from 'stream'

// OAuth 2.0 Credentials (Provided by User)
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID!
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI!

// Refresh Token (To be filled after auth flow)
// Once obtained, we will paste it here to make it permanent
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN! 

// Scopes for Drive API
// 'https://www.googleapis.com/auth/drive' : Full access needed to see folders created by User manually
const SCOPES = ['https://www.googleapis.com/auth/drive']

export function getOAuth2Client() {
  const oAuth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
  )
  
  if (REFRESH_TOKEN) {
      oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN })
  }
  
  return oAuth2Client
}

export async function getDriveClient() {
  // If we have a refresh token, use OAuth (User Storage)
  if (REFRESH_TOKEN) {
      const auth = getOAuth2Client()
      return google.drive({ version: 'v3', auth })
  }

  // Fallback to Service Account (System Storage - 0GB)
  // This is what we are migrating AWAY from.
  const KEY_FILE_PATH = join(process.cwd(), 'service_account.json')
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

// Exported helper to upload directly to a known folder ID (Avoids repeated lookups)
export async function uploadFileByFolderId(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    folderId: string
) {
    const drive = await getDriveClient()
    
    const media = {
        mimeType,
        body: Readable.from(fileBuffer),
    }

    const res = await drive.files.create({
        requestBody: {
            name: fileName,
            parents: [folderId],
        },
        media: media,
        fields: 'id, webViewLink, webContentLink, thumbnailLink',
    })

    await drive.permissions.create({
        fileId: res.data.id!,
        requestBody: {
            role: 'reader',
            type: 'anyone',
        },
    })

    return {
        fileId: res.data.id,
        webViewLink: res.data.webViewLink,
        webContentLink: res.data.webContentLink,
        directLink: `https://drive.google.com/uc?export=view&id=${res.data.id}` 
    }
}

// User provided shared folder ID
export const ROOT_FOLDER_ID = '1FCbXBITvRfl6EeIQb_8eYd-HzJNPkHnn'

export async function uploadFileToDrive(
    fileBuffer: Buffer, 
    fileName: string, 
    mimeType: string,
    folderName: string = 'TMS_Uploads'
) {
    try {
        // 1. Use the shared root folder directly
        const rootFolderId = ROOT_FOLDER_ID
        
        // 2. Get or Create specific subfolder inside the shared folder
        const targetFolderId = await getOrCreateFolder(folderName, rootFolderId)

        // 3. Upload using the ID
        return await uploadFileByFolderId(fileBuffer, fileName, mimeType, targetFolderId)

    } catch (error) {
        console.error('Google Drive Upload Error:', error)
        throw error
    }
}


