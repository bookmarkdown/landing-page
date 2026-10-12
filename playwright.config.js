import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.js',
  fullyParallel: true,
  workers: 2,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:8788',
    browserName: 'chromium',
    reducedMotion: 'reduce',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
  },
  webServer: [
    {
      command: 'pnpm exec wrangler dev --port 8788 --ip 127.0.0.1',
      url: 'http://127.0.0.1:8788',
      reuseExistingServer: false,
      timeout: 60000
    },
    {
      command: 'pnpm exec wrangler pages dev --cwd cloudflare/pages --port 8789 --ip 127.0.0.1',
      url: 'http://127.0.0.1:8789',
      reuseExistingServer: false,
      timeout: 60000
    }
  ]
});