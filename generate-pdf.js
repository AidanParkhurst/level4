/**
 * generate-pdf.js
 *
 * Renders the TriviLife landing page in headless Chromium, captures the fully
 * rendered page as image slices, and embeds those slices into single continuous
 * PDFs — one at desktop width, one at mobile width.
 *
 * Usage:
 *   npm install
 *   node generate-pdf.js
 *
 * Output: trivilife.pdf and trivilife-mobile.pdf in this directory.
 */

const puppeteer = require('puppeteer');
const { PDFDocument } = require('pdf-lib');
const { spawn }  = require('child_process');
const path       = require('path');
const fs         = require('fs');

const PORT         = 8080;
const URL          = `http://localhost:${PORT}`;
const OUT_DESKTOP  = path.join(__dirname, 'trivilife.pdf');
const OUT_MOBILE   = path.join(__dirname, 'trivilife-mobile.pdf');
// Viewport width in CSS pixels — matches desktop layout
const WIDTH        = 1400;
// Typical mobile viewport (iPhone 14 / ~390 logical pixels)
const MOBILE_WIDTH = 390;
const VIEWPORT_HEIGHT = 900;
const SLICE_HEIGHT = 2000;
const PX_TO_PT = 72 / 96;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function startServer() {
  return new Promise((resolve, reject) => {
    const server = spawn('python', ['-u', 'serve.py'], {
      cwd: __dirname,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
    });

    server.stderr.on('data', (d) => process.stderr.write(d));

    // Give the server a moment to bind, then resolve
    const timer = setTimeout(() => resolve(server), 800);

    server.on('error', (err) => {
      clearTimeout(timer);
      reject(new Error(`Failed to start server: ${err.message}`));
    });

    server.on('exit', (code) => {
      if (code !== null && code !== 0) {
        clearTimeout(timer);
        reject(new Error(`Server exited with code ${code}`));
      }
    });
  });
}

function stopServer(server) {
  server.kill();
}

// ---------------------------------------------------------------------------
// Shared PDF rendering helper
// ---------------------------------------------------------------------------

async function renderPdf(browser, { viewportWidth, isMobile, outPath, label }) {
  const page = await browser.newPage();

  // Emulate reduced-motion so scroll-animated elements (opacity:1) are visible
  // without waiting for IntersectionObserver callbacks that never fire headlessly.
  await page.emulateMediaFeatures([
    { name: 'prefers-reduced-motion', value: 'reduce' },
  ]);

  await page.setViewport({
    width: viewportWidth,
    height: VIEWPORT_HEIGHT,
    deviceScaleFactor: isMobile ? 2 : 1,
    isMobile,
    hasTouch: isMobile,
  });

  console.log(`📄  [${label}] Loading ${URL}…`);
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60_000 });

  await page.evaluate(() => document.fonts.ready);

  // Expand lazy-loaded images so they appear in the PDF
  await page.evaluate(async () => {
    const imgs = Array.from(document.querySelectorAll('img[loading="lazy"]'));
    imgs.forEach((img) => { img.loading = 'eager'; });
    await new Promise((r) => setTimeout(r, 500));
  });

  // Fix vh-based heights and freeze interaction-driven states before measuring
  // or capturing image slices.
  await page.addStyleTag({
    content: `
      .hero {
        min-height: 0 !important;
        height: auto !important;
      }
      .animate-on-scroll,
      .animate-on-scroll.visible {
        opacity: 1 !important;
        transform: none !important;
        transition: none !important;
      }
      .nav {
        position: absolute !important;
      }
      .nav-drawer,
      .nav-overlay {
        display: none !important;
      }
      .marathons__track { animation-play-state: paused !important; }
    `,
  });

  // Allow one animation frame for the layout to settle after the style change
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(r)));

  const fullHeight = await page.evaluate(() => {
    const contentBottom = Array.from(document.body.children).reduce(
      (max, el) => Math.max(max, el.getBoundingClientRect().bottom + window.scrollY),
      0
    );

    return Math.ceil(
      Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight,
        contentBottom
      )
    ) + 8;
  });
  console.log(`📐  [${label}] Page height (after layout fix): ${fullHeight}px`);

  console.log(`📷  [${label}] Capturing image slices…`);
  const pdf = await PDFDocument.create();
  const pdfPage = pdf.addPage([
    viewportWidth * PX_TO_PT,
    fullHeight * PX_TO_PT,
  ]);

  for (let top = 0; top < fullHeight; top += SLICE_HEIGHT) {
    const sliceHeight = Math.min(SLICE_HEIGHT, fullHeight - top);
    const pngBytes = await page.screenshot({
      type: 'png',
      clip: {
        x: 0,
        y: top,
        width: viewportWidth,
        height: sliceHeight,
      },
      captureBeyondViewport: true,
    });
    const image = await pdf.embedPng(pngBytes);

    pdfPage.drawImage(image, {
      x: 0,
      y: (fullHeight - top - sliceHeight) * PX_TO_PT,
      width: viewportWidth * PX_TO_PT,
      height: sliceHeight * PX_TO_PT,
    });
  }

  console.log(`🖨️   [${label}] Writing flattened PDF…`);
  const pdfBytes = await pdf.save();
  fs.writeFileSync(outPath, pdfBytes);

  const size = (fs.statSync(outPath).size / 1024).toFixed(1);
  console.log(`✅  [${label}] Saved: ${outPath}  (${size} KB)`);

  await page.close();
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

(async () => {
  console.log('🚀  Starting local server…');
  const server = await startServer();

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    await renderPdf(browser, {
      viewportWidth: WIDTH,
      isMobile: false,
      outPath: OUT_DESKTOP,
      label: 'desktop',
    });

    await renderPdf(browser, {
      viewportWidth: MOBILE_WIDTH,
      isMobile: true,
      outPath: OUT_MOBILE,
      label: 'mobile',
    });
  } finally {
    await browser.close();
    stopServer(server);
    console.log('🏁  Done.');
  }
})();
