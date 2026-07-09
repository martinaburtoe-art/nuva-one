import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'cl.nuvaone.app',
  appName: 'Nüva One',
  webDir: 'dist',
  server: {
    url: 'https://nuvaone.lovable.app',
    cleartext: false
  }
};

export default config;
