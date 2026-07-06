import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: "com.kevin.dailyschedule",
  appName: "DailySchedulePlanner",
  server: {
    url: "https",
    cleartext: false,
  },
};

export default config;