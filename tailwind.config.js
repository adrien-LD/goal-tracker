/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0f172a",
        breeze: "#f8fafc",
        cloud: "#e2e8f0",
        mint: "#14b8a6",
        sky: "#0284c7",
        sand: "#f1f5f9",
      },
      boxShadow: {
        soft: "0 12px 40px rgba(15, 23, 42, 0.08)",
      },
    },
  },
  plugins: [],
};
