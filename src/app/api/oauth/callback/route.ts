import { NextResponse, NextRequest } from "next/server"
import { getOAuth2Client } from "@/lib/google-drive"

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.json({ error: "No code provided" }, { status: 400 })
  }

  try {
    const oAuth2Client = getOAuth2Client()
    const { tokens } = await oAuth2Client.getToken(code)
    
    // Display the Refresh Token to the user
    return NextResponse.json({
        success: true,
        message: "Authentication Successful!",
        REFRESH_TOKEN: tokens.refresh_token || "No refresh token returned (Did you already authorize?)",
        NOTE: "Please copy the REFRESH_TOKEN above and send it to the developer (me) to complete the setup.",
        full_tokens: tokens
    })

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
