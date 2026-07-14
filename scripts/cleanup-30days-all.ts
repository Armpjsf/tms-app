import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const ASSETS_BUCKET = 'company-assets'

const supabase = createClient(supabaseUrl, supabaseKey)

// Database logs cutoff (45 days)
const dbCutoffDate = new Date()
dbCutoffDate.setDate(dbCutoffDate.getDate() - 45)
const dbCutoffStr = dbCutoffDate.toISOString()

// Storage files & job image links cutoff (20 days)
const storageCutoffDate = new Date()
storageCutoffDate.setDate(storageCutoffDate.getDate() - 20)
const storageCutoffStr = storageCutoffDate.toISOString()
const storageCutoffTime = storageCutoffDate.getTime()

const FOLDERS_TO_CLEAN = [
    'Job_Photos',
    'Pickup_Photos',
    'POD_Photos',
    'Signatures',
    'Pickup_Signatures',
    'POD_Signatures',
    'Reports',
    'POD_Reports'
]

async function cleanupStorageFolder(folder: string) {
    console.log(`\n📂 Scanning folder: "${folder}" in storage...`)
    let offset = 0
    const limit = 100
    let hasMore = true
    let totalDeleted = 0

    while (hasMore) {
        // List files in the folder using the official Storage API
        const { data: files, error } = await supabase.storage
            .from(ASSETS_BUCKET)
            .list(folder, {
                limit,
                offset,
                sortBy: { column: 'created_at', order: 'asc' }
            })

        if (error) {
            console.error(`❌ Error listing files in folder "${folder}": ${error.message}`)
            break
        }

        if (!files || files.length === 0) {
            hasMore = false
            break
        }

        // OPTIMIZATION:
        // Since files are sorted by created_at ASC (oldest first), if the very first (oldest) file
        // is newer than our cutoff time, it means ALL files in this folder are newer than the cutoff.
        // We can safely break the loop immediately, saving many paginated API calls!
        const oldestFile = files.find(f => f.name !== '.emptyFolderPlaceholder')
        if (oldestFile) {
            const oldestFileTime = new Date(oldestFile.created_at).getTime()
            if (oldestFileTime >= storageCutoffTime) {
                console.log(`Optimization: Oldest file in "${folder}" is newer than 20 days. Skipping rest of folder.`)
                hasMore = false
                break
            }
        }

        const filesToDelete: string[] = []

        files.forEach(file => {
            if (file.name === '.emptyFolderPlaceholder') return

            const fileCreatedAt = new Date(file.created_at).getTime()
            if (fileCreatedAt < storageCutoffTime) {
                // Construct the full path inside the bucket (e.g. "Job_Photos/filename.jpg")
                filesToDelete.push(`${folder}/${file.name}`)
            }
        })

        if (filesToDelete.length > 0) {
            console.log(`Found ${filesToDelete.length} files older than 20 days. Deleting...`)
            const { error: deleteErr } = await supabase.storage
                .from(ASSETS_BUCKET)
                .remove(filesToDelete)

            if (deleteErr) {
                console.error(`❌ Error deleting files: ${deleteErr.message}`)
            } else {
                totalDeleted += filesToDelete.length
                console.log(`✅ Successfully deleted ${filesToDelete.length} files.`)
            }
            
            // Since we deleted files, we don't increase the offset because the remaining files shift up.
        } else {
            // If no files were deleted in this batch, we must advance the offset to check the next batch
            offset += limit
        }

        // If we received fewer files than the limit, it means we reached the end
        if (files.length < limit) {
            hasMore = false
        }
    }

    console.log(`✨ Finished folder "${folder}". Total deleted: ${totalDeleted} files.`)
}

async function run() {
    console.log('🚀 Starting Storage Folder API Cleanup Script...')
    console.log(`DB Cutoff: ${dbCutoffStr} (45d), Storage Cutoff: ${storageCutoffStr} (20d)`)

    // Clean up database tables directly
    console.log('\n--- Cleaning database tables ---')
    const tablesToDelete = [
        { name: 'gps_logs', dateCol: 'timestamp' },
        { name: 'System_Logs', dateCol: 'created_at' },
        { name: 'Notifications', dateCol: 'Created_At' },
        { name: 'Chat_Messages', dateCol: 'Created_At' }
    ]

    for (const table of tablesToDelete) {
        console.log(`Cleaning table ${table.name}...`)
        const { error, count } = await supabase
            .from(table.name)
            .delete({ count: 'exact' })
            .lt(table.dateCol, dbCutoffStr)
        
        if (error) {
            console.error(`❌ Error cleaning table ${table.name}: ${error.message}`)
        } else {
            console.log(`✅ Deleted ${count || 0} records from ${table.name}.`)
        }
    }

    // Clean up database links first to be safe
    console.log('\n--- Nullifying image links in Jobs_Main older than 20 days ---')
    const { error: dbErr } = await supabase
        .from('Jobs_Main')
        .update({
            Photo_Proof_Url: null,
            Signature_Url: null,
            Pickup_Photo_Url: null,
            Pickup_Signature_Url: null
        })
        .lt('Created_At', storageCutoffStr)

    if (dbErr) {
        console.error(`❌ Error updating Jobs_Main: ${dbErr.message}`)
    } else {
        console.log('✅ Nullified database links successfully.')
    }

    // Clean up each folder sequentially using the Storage API
    for (const folder of FOLDERS_TO_CLEAN) {
        await cleanupStorageFolder(folder)
    }

    console.log('\n🎉 Storage cleanup completed successfully!')
}

run()
