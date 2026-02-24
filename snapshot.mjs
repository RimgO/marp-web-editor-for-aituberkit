import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const outDir = path.join(process.cwd(), 'docs');
if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

(async () => {
    try {
        const browser = await chromium.launch({ headless: true });
        // Use a slightly larger viewport to avoid cramming
        const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
        const page = await context.newPage();

        console.log("Navigating to app...");
        await page.goto('http://localhost:5173/');

        console.log("Loading demo...");
        await page.fill('input[type="text"]', 'slides/demo');
        await page.click('button:has-text("Load")');

        // Wait for it to load and render
        await page.waitForTimeout(3000);

        // Click on Scripts JSON tab to showcase the new feature
        console.log("Switching to Scripts JSON mode...");
        await page.click('button:has-text("Scripts JSON")');
        await page.waitForTimeout(1000);

        console.log("Taking Notes Open screenshot...");
        await page.screenshot({ path: path.join(outDir, 'screenshot-notes-open.png') });

        console.log("Toggling Notes column to close it...");
        await page.click('th[title="Toggle Notes column"]');
        await page.waitForTimeout(1000);

        console.log("Taking Notes Closed screenshot...");
        await page.screenshot({ path: path.join(outDir, 'screenshot-notes-closed.png') });

        await browser.close();
        console.log("Done!");
    } catch (e) {
        console.error("Playwright Error", e);
        process.exit(1);
    }
})();
