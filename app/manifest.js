// app/manifest.js

export default function manifest() {
  return {
    name: 'NutriAI',
    short_name: 'NutriAI',
    description: 'Real-time weight logs and food macro tracking via IoT smart plate interface',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#0B121F',
    theme_color: '#00A86B',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}