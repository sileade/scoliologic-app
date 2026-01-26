import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdir } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const SCREENSHOTS_DIR = join(__dirname, '../docs/screenshots');

const pages = [
  { name: '01_auth', path: '/auth', waitFor: 'button' },
  { name: '02_dashboard', path: '/', waitFor: '.quick-actions, button' },
  { name: '03_messages', path: '/messages', waitFor: 'button' },
  { name: '04_devices', path: '/devices', waitFor: 'button' },
  { name: '05_settings', path: '/settings', waitFor: 'button' },
];

async function generateScreenshots() {
  console.log('Starting screenshot generation...');
  console.log(`Base URL: ${BASE_URL}`);
  
  await mkdir(SCREENSHOTS_DIR, { recursive: true });
  
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/usr/bin/chromium-browser',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  
  for (const { name, path, waitFor } of pages) {
    try {
      console.log(`Capturing ${name} (${path})...`);
      await page.goto(`${BASE_URL}${path}`, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Wait for content to load
      await page.waitForSelector(waitFor, { timeout: 10000 }).catch(() => {});
      await new Promise(r => setTimeout(r, 1000)); // Extra wait for animations
      
      const screenshotPath = join(SCREENSHOTS_DIR, `${name}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: false });
      console.log(`  ✓ Saved: ${screenshotPath}`);
    } catch (error) {
      console.error(`  ✗ Error capturing ${name}: ${error.message}`);
    }
  }
  
  await browser.close();
  console.log('Screenshot generation complete!');
}

generateScreenshots().catch(console.error);
