import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cityexplorer.app',
  appName: 'CityExplorer',
  webDir: 'dist',
  server: {
    // 使用 https 协议，解决某些网络请求问题
    androidScheme: 'https'
  },
  android: {
    allowMixedContent: true,
    webContentsDebuggingEnabled: true
  }
};

export default config;
