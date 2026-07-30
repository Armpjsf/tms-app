// ─────────────────────────────────────────────────────────────────
// Embedding helpers for RAG semantic search.
//   - embedGemini: text-embedding-004 (768-dim), works anywhere incl. Vercel
//   - embedNomic : nomic-embed-text via local ollama (768-dim), local only
// Both spaces are stored side-by-side in the ai_embeddings table.
// ─────────────────────────────────────────────────────────────────

// gemini-embedding-001 defaults to 3072 dims; force 768 to match the
// ai_embeddings vector(768) column (and the nomic space width).
const GEMINI_EMBED_MODEL = 'gemini-embedding-001'
const GEMINI_EMBED_DIM = 768
const OLLAMA_EMBED_MODEL = 'nomic-embed-text'

/** Embed a single string with Gemini. Returns 768 floats. */
export async function embedGemini(text: string, apiKey?: string): Promise<number[]> {
    const key = apiKey || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY
    if (!key) throw new Error('Missing GEMINI_API_KEY')

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_EMBED_MODEL}:embedContent?key=${key}`
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: { parts: [{ text }] }, outputDimensionality: GEMINI_EMBED_DIM }),
        signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) throw new Error(`Gemini embed HTTP ${res.status}: ${(await res.text().catch(() => '')).slice(0, 150)}`)
    const data = await res.json()
    const values: number[] | undefined = data?.embedding?.values
    if (!values?.length) throw new Error('Empty Gemini embedding')
    return values
}

/** Embed a single string with local ollama nomic-embed-text. Returns 768 floats. */
export async function embedNomic(text: string, host = 'http://localhost:11434'): Promise<number[]> {
    const res = await fetch(`${host}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: OLLAMA_EMBED_MODEL, prompt: text }),
        signal: AbortSignal.timeout(30000),
    })
    if (!res.ok) throw new Error(`ollama embed HTTP ${res.status}`)
    const data = await res.json()
    const values: number[] | undefined = data?.embedding
    if (!values?.length) throw new Error('Empty nomic embedding')
    return values
}
