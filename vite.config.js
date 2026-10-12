import { defineConfig } from 'vite';

function landingAliases(server) {
  server.middlewares.use((request, response, next) => {
    const url = new URL(request.url, 'http://localhost');
    if (url.pathname === '/landing' || url.pathname === '/landing.html') {
      request.url = `/index.html${url.search}`;
    }
    next();
  });
}

export default defineConfig({
  plugins: [{ name: 'landing-aliases', configureServer: landingAliases, configurePreviewServer: landingAliases }],
  server: { port: 5173, strictPort: true }
});