import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.asterlyra.nihongo',
  appName: '日语学习',
  webDir: 'dist',
  // Keep this origin stable: IndexedDB belongs to this app-local address.
  server: { hostname: 'localhost', androidScheme: 'https' },
  android: { backgroundColor: '#fffefa' },
};

export default config;
