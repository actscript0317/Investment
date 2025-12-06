/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./public/**/*.html",
    "./public/**/*.js",
  ],
  theme: {
    extend: {
      colors: {
        'dark-bg': '#0B0C10',
        'dark-card': '#1F2833',
        'brand-gold': '#D4AF37',
        'brand-blue': '#66FCF1',
        'text-main': '#FFFFFF',
        'text-sub': '#B0B0B0',
        'up-red': '#FF4B4B',
        'down-blue': '#00FF88', // Using Green for down as per request? No, usually Red is down, Green is up in global, but in Korea Red is Up, Blue is Down. User said "Pastel Red/Green or Neon". Let's stick to Korea standard: Red=Up, Blue=Down, but neon versions.
        // Wait, user said "Pastel Red/Green or Neon" instead of "Old Red/Blue".
        // In Korea: Red = Up, Blue = Down.
        // I will define 'neon-red' and 'neon-green' (or blue-ish green) and apply them contextually.
        'neon-up': '#FF4B4B', // Bright Red
        'neon-down': '#4B89FF', // Bright Blue
      },
      fontFamily: {
        sans: ['Inter', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'glow': '0 0 10px rgba(212, 175, 55, 0.3)',
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.3)',
      }
    },
  },
  plugins: [],
}
