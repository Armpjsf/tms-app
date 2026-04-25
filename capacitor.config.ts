import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.armdd.tmsepod',
  appName: 'LOGIS Driver',
  webDir: 'public',
  server: {
    url: 'https://tms-app-five.vercel.app',
    cleartext: true,
    androidScheme: 'https',
    allowNavigation: [
      '*'
    ]
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
