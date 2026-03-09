import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.armdd.tmsepod',
  appName: 'TMS_ePOD',
  webDir: 'public',
  server: {
    url: 'https://tms-app-five.vercel.app',
    cleartext: true,
    androidScheme: 'https',
    allowNavigation: [
      '*'
    ]
  }
};

export default config;
