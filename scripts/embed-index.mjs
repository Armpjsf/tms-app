// ─────────────────────────────────────────────────────────────────
// Local RAG indexer for the TMS AI assistant.
// Fetches Master_Customers + Master_Locations from Supabase, builds a
// human-readable content string per row, embeds it with BOTH
// Gemini (text-embedding-004) and local ollama (nomic-embed-text),
// and upserts into ai_embeddings.
//
// Run:  node scripts/embed-index.mjs
// Requires: migration 20260730_ai_embeddings_rag.sql applied, ollama running.
// ─────────────────────────────────────────────────────────────────
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

// ── minimal .env.local loader (avoids --env-file choking on multiline JSON) ──
function loadEnv() {
    const out = {}
    try {
        const raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
        for (const line of raw.split('\n')) {
            const m = line.match(/^([A-Z0-9_]+)="?([^"]*)"?$/)
            if (m) out[m[1]] = m[2]
        }
    } catch { /* fall back to process.env */ }
    return { ...out, ...process.env }
}

const env = loadEnv()
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY
const GEMINI_KEY = env.GEMINI_API_KEY || env.NEXT_PUBLIC_GEMINI_API_KEY
const OLLAMA_HOST = env.OLLAMA_HOST || 'http://localhost:11434'

if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('✗ Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

// Retries on rate-limit (429) / transient errors with backoff so a hiccup
// doesn't leave the vector null (which would otherwise clobber a good value).
async function embedGemini(text, attempt = 0) {
    if (!GEMINI_KEY) return null
    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${GEMINI_KEY}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: { parts: [{ text }] }, outputDimensionality: 768 }),
        })
        if (res.status === 429 || res.status >= 500) {
            if (attempt < 5) { await sleep(1500 * (attempt + 1)); return embedGemini(text, attempt + 1) }
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return (await res.json())?.embedding?.values ?? null
    } catch (e) {
        if (attempt < 5) { await sleep(1500 * (attempt + 1)); return embedGemini(text, attempt + 1) }
        console.warn('  gemini embed failed:', e.message); return null
    }
}

async function embedNomic(text) {
    try {
        const res = await fetch(`${OLLAMA_HOST}/api/embeddings`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'nomic-embed-text', prompt: text }),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return (await res.json())?.embedding ?? null
    } catch (e) { console.warn('  nomic embed failed:', e.message); return null }
}

function customerContent(c) {
    return [
        `ลูกค้า: ${c.Customer_Name ?? ''}`,
        c.Contact_Person && `ผู้ติดต่อ: ${c.Contact_Person}`,
        c.Phone && `โทร: ${c.Phone}`,
        c.Address && `ที่อยู่: ${c.Address}`,
        c.Default_Origin && `ต้นทางประจำ: ${c.Default_Origin}`,
        c.Tax_ID && `เลขภาษี: ${c.Tax_ID}`,
    ].filter(Boolean).join(' | ')
}

function locationContent(l) {
    return [
        `สถานที่: ${l.Name ?? ''}`,
        l.Address && `ที่อยู่: ${l.Address}`,
        l.Phone && `โทร: ${l.Phone}`,
        (l.Lat && l.Lon) && `พิกัด: ${l.Lat},${l.Lon}`,
    ].filter(Boolean).join(' | ')
}

async function indexRows(rows, sourceType, idKey, branchKey, contentFn) {
    // Skip rows already fully embedded (both spaces) so re-runs only fill gaps
    // — avoids re-hitting the Gemini rate limit on every full pass.
    const { data: done } = await supabase
        .from('ai_embeddings')
        .select('source_id')
        .eq('source_type', sourceType)
        .not('embedding_gemini', 'is', null)
        .not('embedding_nomic', 'is', null)
    const doneSet = new Set((done ?? []).map(d => String(d.source_id)))

    let ok = 0, skip = 0
    for (const row of rows) {
        if (doneSet.has(String(row[idKey]))) { skip++; continue }
        const content = contentFn(row)
        if (!content || content.length < 5) { skip++; continue }
        const [g, n] = await Promise.all([embedGemini(content), embedNomic(content)])
        // Only write vector columns that succeeded — never overwrite a good
        // vector with null when one provider failed (PostgREST upsert updates
        // only the columns present in the payload).
        const payload = {
            source_type: sourceType,
            source_id: String(row[idKey]),
            content,
            branch_id: row[branchKey] ?? null,
            metadata: { name: row.Customer_Name ?? row.Name ?? null },
            updated_at: new Date().toISOString(),
        }
        if (g) payload.embedding_gemini = g
        if (n) payload.embedding_nomic = n
        const { error } = await supabase.from('ai_embeddings').upsert(payload, { onConflict: 'source_type,source_id' })
        if (error) { console.warn(`  upsert ${row[idKey]} failed:`, error.message); skip++ }
        else { ok++; process.stdout.write('.') }
    }
    console.log(`\n${sourceType}: indexed ${ok}, skipped ${skip}`)
}

async function main() {
    console.log('→ Fetching data from Supabase...')
    const [{ data: customers }, { data: locations }] = await Promise.all([
        supabase.from('Master_Customers').select('Customer_ID, Customer_Name, Contact_Person, Phone, Address, Default_Origin, Tax_ID, Branch_ID'),
        supabase.from('Master_Locations').select('Location_ID, Name, Address, Phone, Lat, Lon, Branch_ID'),
    ])
    console.log(`  customers: ${customers?.length ?? 0}, locations: ${locations?.length ?? 0}`)

    if (customers?.length) await indexRows(customers, 'customer', 'Customer_ID', 'Branch_ID', customerContent)
    if (locations?.length) await indexRows(locations, 'location', 'Location_ID', 'Branch_ID', locationContent)
    console.log('✓ Done')
}

main().catch(e => { console.error(e); process.exit(1) })
