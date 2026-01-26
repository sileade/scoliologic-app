const puppeteer = require('puppeteer');

async function takeScreenshots() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/usr/bin/chromium-browser',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  
  const baseUrl = 'http://localhost:3000';
  const screenshotDir = '/home/ubuntu/scoliologic-app/docs/screenshots';
  
  // Auth page
  await page.goto(`${baseUrl}/auth`, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.screenshot({ path: `${screenshotDir}/01_auth.png` });
  console.log('✓ Auth screenshot');
  
  // Dashboard
  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.screenshot({ path: `${screenshotDir}/02_dashboard.png` });
  console.log('✓ Dashboard screenshot');
  
  // Messages
  await page.goto(`${baseUrl}/messages`, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.screenshot({ path: `${screenshotDir}/03_messages.png` });
  console.log('✓ Messages screenshot');
  
  // Devices
  await page.goto(`${baseUrl}/devices`, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.screenshot({ path: `${screenshotDir}/04_devices.png` });
  console.log('✓ Devices screenshot');
  
  // Settings
  await page.goto(`${baseUrl}/settings`, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.screenshot({ path: `${screenshotDir}/05_settings.png` });
  console.log('✓ Settings screenshot');
  
  await browser.close();
  console.log('All screenshots taken!');
}

takeScreenshots().catch(console.error);
