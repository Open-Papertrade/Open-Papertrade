// Global App Configuration
// Change these values to customize the app

export const APP_CONFIG = {
  // App name - displayed in sidebar logo and page titles
  name: "Open Papertrade",

  // App tagline
  tagline: "Paper Trading Simulator",

  // Default user info (overridden by auth)
  defaultUser: {
    name: "",
    username: "",
    email: "",
    initials: "",
    avatarUrl: null as string | null,
  },

  // Currency settings
  currency: {
    symbol: "$",
    code: "USD",
  },

  // Feature flags
  features: {
    darkMode: true,
    notifications: true,
    advancedTrading: false,
  },
};

export type AppConfig = typeof APP_CONFIG;
