import { NextResponse } from "next/server"
import { searchPlacesGoogle } from "@/lib/ai/geocoding"

// TEMPORARY debug endpoint — verify Google Maps env + Places API on production.
// Does NOT expose the key. Remove after diagnosing.
export const dynamic = "force-dynamic"

export async function GET() {
  const key = process.env.GOOGLE_MAPS_API_KEY || ""
  const info: Record<string, unknown> = {
    hasKey: key.length > 0,
    keyLength: key.length,
    keyPrefix: key.slice(0, 4), // "AIza" expected
  }

  // Raw call to see the exact HTTP status / error body from Google.
  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.location",
      },
      body: JSON.stringify({ textQuery: "formica", languageCode: "th", regionCode: "TH", maxResultCount: 3 }),
    })
    info.rawStatus = res.status
    info.rawBody = await res.text()
  } catch (err) {
    info.rawError = String(err)
  }

  try {
    const results = await searchPlacesGoogle("formica")
    info.placesCount = results.length
    info.firstResult = results[0] ?? null
  } catch (err) {
    info.error = String(err)
  }

  return NextResponse.json(info)
}
