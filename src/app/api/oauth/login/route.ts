import { NextResponse } from "next/server"
import { getOAuth2Client } from "@/lib/google-drive"

export const dynamic = 'force-dynamic'

export async function GET() {
  const oAuth2Client = getOAuth2Client()

  // Generate the url that will be used for the consent dialog.
  const authorizeUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline', // Critical for getting a refresh token
    scope: ['https://www.googleapis.com/auth/drive'], // Full access
    prompt: 'consent' // Force prompts to ensure we get a refresh token
  })

  return NextResponse.redirect(authorizeUrl)
}
