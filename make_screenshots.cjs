const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const screenshotsDir = path.join(__dirname, 'docs/screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

const pages = [
  { name: '01_auth', path: '/auth', wait: 2000 },
  { name: '02_dashboard', path: '/', wait: 2000 },
  { name: '03_messages', path: '/messages', wait: 2000 },
  { name: '04_devices', path: '/devices', wait: 2000 },
  { name: '05_settings', path: '/settings', wait: 2000 },
];

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/usr/bin/chromium-browser',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  // Desktop screenshots
  console.log('Creating desktop screenshots...');
  const desktopPage = await browser.newPage();
  await desktopPage.setViewport({ width: 1280, height: 800 });
  
  for (const p of pages) {
    try {
      await desktopPage.goto(`http://localhost:3000${p.path}`, { waitUntil: 'networkidle0', timeout: 30000 });
      await new Promise(r => setTimeout(r, p.wait));
      await desktopPage.screenshot({ 
        path: path.join(screenshotsDir, `${p.name}.png`),
        fullPage: false
      });
      console.log(`✓ ${p.name}.png`);
    } catch (e) {
      console.log(`✗ ${p.name}: ${e.message}`);
    }
  }

  // Mobile screenshots
  const mobileDir = path.join(screenshotsDir, 'mobile');
  if (!fs.existsSync(mobileDir)) {
    fs.mkdirSync(mobileDir, { recursive: true });
  }

  console.log('Creating mobile screenshots...');
  const mobilePage = await browser.newPage();
  await mobilePage.setViewport({ width: 390, height: 844, isMobile: true });

  const mobilePages = [
    { name: '01_auth_mobile', path: '/auth' },
    { name: '02_dashboard_mobile', path: '/' },
    { name: '03_messages_mobile', path: '/messages' },
    { name: '04_devices_mobile', path: '/devices' },
  ];

  for (const p of mobilePages) {
    try {
      await mobilePage.goto(`http://localhost:3000${p.path}`, { waitUntil: 'networkidle0', timeout: 30000 });
      await new Promise(r => setTimeout(r, 2000));
      await mobilePage.screenshot({ 
        path: path.join(mobileDir, `${p.name}.png`),
        fullPage: false
      });
      console.log(`✓ mobile/${p.name}.png`);
    } catch (e) {
      console.log(`✗ mobile/${p.name}: ${e.message}`);
    }
  }

  await browser.close();
  console.log('Done!');
})();
