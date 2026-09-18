import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: {
          900: "#17161a",
          800: "#201f24",
          700: "#2b2a30",
          600: "#423f49",
          500: "#6e6c75",
          300: "#a8a6ae",
        },
        paper: "#faf9f7",
        line: {
          DEFAULT: "#3a3840",
        },
        orange: {
          100: "#ffe7db",
          300: "#ffb185",
          500: "#ff5a1f",
          600: "#e14a0c",
          700: "#b93b09",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
      borderRadius: {
        sm: "10px",
        md: "16px",
        lg: "28px",
      },
      boxShadow: {
        sm: "0 2px 10px rgba(0, 0, 0, 0.24)",
        md: "0 12px 32px rgba(0, 0, 0, 0.32)",
        brand: "0 14px 32px rgba(255, 90, 31, 0.28)",
      },
    },
  },
  plugins: [],
};

export default config;
