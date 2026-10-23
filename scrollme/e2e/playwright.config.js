const { defineConfig, devices } = require('@playwright/test');

const PORT = Number(process.env.E2E_WEB_PORT || 3100);
// Sandboxed/corporate networks: reach external images and fonts through the proxy.
const proxy = process.env.HTTPS_PROXY ? { args: [`--proxy-server=${process.env.HTTPS_PROXY}`, '--proxy-bypass-list=localhost;127.0.0.1'] } : {};

module.exports = defineConfig({
  testDir: './tests',
  // The tests share one database, so they run one at a time.
  workers: 1,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  timeout: 60000,
  expect: { timeout: 10000 },
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: proxy,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'phone', use: { ...devices['Pixel 7'] }, grep: /@phone/ },
  ],
  webServer: {
    command: 'node stack.js',
    url: `http://localhost:${PORT}/api/ready`,
    timeout: 180000,
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
  },
});
