import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Social previews (WhatsApp, LinkedIn, X…) need absolute image URLs.
 * Set SITE_URL (e.g. https://abdullahfida.com) at build time; on Vercel the production
 * domain is picked up automatically.
 */
function absoluteSocialUrls(): Plugin {
  const raw = process.env.SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '');
  const site = raw.replace(/\/$/, '');
  return {
    name: 'absolute-social-urls',
    transformIndexHtml(html) {
      if (!site) return html;
      return html
        .replace(/content="\/og-image\.jpg"/g, `content="${site}/og-image.jpg"`)
        .replace('</title>', `</title>\n    <meta property="og:url" content="${site}/" />\n    <link rel="canonical" href="${site}/" />`);
    },
  };
}

export default defineConfig({
  plugins: [react(), absoluteSocialUrls()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/three/') || id.includes('@react-three')) return 'three';
        },
      },
    },
  },
});
