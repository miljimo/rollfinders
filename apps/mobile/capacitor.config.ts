import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "oepe.rollfinders",
  appName: "RollFinders",
  webDir: "www",
  server: {
    cleartext: false,
    url: "https://rollfinders.com/mobile",
  },
  plugins: {
    SplashScreen: {
      backgroundColor: "#056961",
      launchAutoHide: true,
      showSpinner: false,
    },
  },
};

export default config;
