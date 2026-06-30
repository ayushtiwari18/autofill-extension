/**
 * Playwright Configuration for E2E Extension Testing
 *
 * This config loads the built Chrome extension from ./dist
 * and runs automated tests against a local test form.
 *
 * Prerequisites:
 *   1. npm run build  (creates dist/ folder)
 *   2. npm run test:e2e
 */

const path = require('path');

module.exports = {
  testDir: './',
  testMatch: ['**/*.test.js'],
  timeout: 30000,
  retries: 1,

  use: {
    // Launch Chrome with the extension loaded
    channel: 'chrome',
    headless: false, // Extensions require non-headless mode
    viewport: { width: 1280, height: 720 },
    launchOptions: {
      args: [
        `--disable-extensions-except=${path.resolve(__dirname, '../../dist')}`,
        `--load-extension=${path.resolve(__dirname, '../../dist')}`,
        '--no-first-run',
        '--no-default-browser-check'
      ]
    }
  },

  // Run a local static server on port 3333 to serve test-form.html
  webServer: {
    command: 'npx serve public -p 3333 -s',
    port: 3333,
    reuseExistingServer: true,
    timeout: 10000
  },

  reporter: [['list'], ['html', { open: 'never' }]]
};
