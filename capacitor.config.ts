import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: "com.kevin.dailyschedule",
  appName: "DailySchedulePlanner",
  server: {
    url: "https://daily-schedule-planner-khai.vercel.app",
    cleartext: false,
  },
};

export default config;