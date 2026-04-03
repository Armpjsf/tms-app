import type { MetadataRoute } from 'next'

export const dynamic = 'force-static'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'LOGIS-PRO Driver',
    short_name: 'LOGIS Driver',
    description: 'Driver Application for LOGIS-PRO TMS',
    start_url: '/mobile/dashboard',
    scope: '/',
    display: 'standalone',
    background_color: '#001E4C',
    theme_color: '#001E4C',
    orientation: 'portrait',
    icons: [
      {
        src: '/logo-tactical.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/logo-tactical.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
