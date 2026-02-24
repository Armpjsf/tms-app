import { NextResponse } from 'next/server'
import { getDriveClient, ROOT_FOLDER_ID } from '@/lib/google-drive'

export const dynamic = 'force-dynamic'

export async function GET() {
  const reports: any = {
    timestamp: new Date().toISOString(),
    env: {
      GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
      GOOGLE_REFRESH_TOKEN: !!process.env.GOOGLE_REFRESH_TOKEN,
      GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || 'not set',
    },
    rootFolderId: ROOT_FOLDER_ID,
    checks: {}
  }

  try {
    console.log("[Diag] Starting Drive Connectivity Check...")
    const drive = await getDriveClient()
    
    // 1. Check About
    try {
        console.log("[Diag] Testing drive.about.get")
        const about = await drive.about.get({ fields: 'user, storageQuota' })
        reports.checks.auth = {
            status: 'success',
            user: about.data.user?.emailAddress,
            quotaLimit: about.data.storageQuota?.limit,
            quotaUsage: about.data.storageQuota?.usage
        }
    } catch (e: any) {
        console.error("[Diag] Auth Check Failed:", e)
        reports.checks.auth = { 
            status: 'failed', 
            error: e.message,
            code: e.code,
            stack: e.stack?.split('\n').slice(0, 3).join('\n') // Just first few lines
        }
    }

    // 2. Check Root Folder
    try {
        console.log("[Diag] Testing drive.files.get for root:", ROOT_FOLDER_ID)
        const folder = await drive.files.get({ 
            fileId: ROOT_FOLDER_ID, 
            fields: 'id, name, capabilities' 
        })
        reports.checks.rootFolder = {
            status: 'success',
            name: folder.data.name,
            canAddChildren: folder.data.capabilities?.canAddChildren
        }
    } catch (e: any) {
        console.error("[Diag] Root Folder Check Failed:", e)
        reports.checks.rootFolder = { 
            status: 'failed', 
            error: e.message,
            code: e.code
        }
    }

    return NextResponse.json(reports)
  } catch (err: any) {
    console.error("[Diag] Critical Failure:", err)
    return NextResponse.json({ 
        error: 'Critical Client Failure', 
        message: err.message,
        stack: err.stack,
        reports 
    }, { status: 500 })
  }
}
