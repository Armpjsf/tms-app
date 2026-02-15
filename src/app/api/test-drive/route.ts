import { NextResponse } from "next/server"
import { uploadFileByFolderId, getOrCreateFolder, ROOT_FOLDER_ID } from "@/lib/google-drive"

export const dynamic = 'force-dynamic'

export async function GET() {
  const steps = []
  try {
    steps.push("1. Starting Drive Test...")
    steps.push(`2. Using Root Folder ID: ${ROOT_FOLDER_ID}`)

    // 1. Try to create a test folder
    steps.push("3. Attempting to get/create 'TEST_CONNECTIVITY' folder...")
    const folderId = await getOrCreateFolder("TEST_CONNECTIVITY", ROOT_FOLDER_ID)
    steps.push(`4. Folder 'TEST_CONNECTIVITY' resolved (ID: ${folderId})`)

    // 2. Try to upload a file
    steps.push("5. Creating test file buffer...")
    const buffer = Buffer.from("Hello TMS, this is a test connection file.", "utf-8")
    
    steps.push("6. Uploading 'test_file.txt'...")
    const result = await uploadFileByFolderId(buffer, "test_file.txt", "text/plain", folderId)
    
    steps.push(`7. Upload Success! File ID: ${result.fileId}`)
    steps.push(`8. View Link: ${result.webViewLink}`)

    return NextResponse.json({ success: true, logs: steps, result })

  } catch (error: any) {
    console.error("Test Drive Error:", error)
    steps.push(`ERROR: ${error.message}`)
    if (error.response) {
        steps.push(`API Error: ${JSON.stringify(error.response.data)}`)
    }
    return NextResponse.json({ success: false, logs: steps, error: error.message }, { status: 500 })
  }
}
