/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#0F172A", // Slate 900
        secondary: "#3B82F6", // Blue 500
        success: "#10B981", // Emerald
        warning: "#F59E0B", // Amber
        error: "#EF4444", // Red
        background: "#F8FAFC", // Slate 50
        surface: "#FFFFFF",
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
