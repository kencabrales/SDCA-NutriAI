// app/manifest.js

export default function manifest() {
  return {
    name: 'NutriAI',
    short_name: 'NutriAI',
    description: 'Food and nutrition tracking with offline support',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#0B121F',
    theme_color: '#00A86B',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}