/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors:{
        primary:'#111111',
        secondary:'#666666',
        Background:'#FFFFFF',
        surface:'#F7F7F7',
        textPrimary:'#111111',
        textSecondary:'#666666',
        textTertiary:'#999999',
        accent:'#FF4C3B',
        border:'#EEEEEE',
      }
    },
  },
  plugins: [],
}