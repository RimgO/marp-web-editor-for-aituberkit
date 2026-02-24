import { chromium } from 'playwright';

(async () => {
    try {
        const browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();
        await page.goto('http://localhost:5176/');
        
        // Wait for page load
        await page.waitForTimeout(2000);
        
        // Type into path input
        await page.fill('input[type="text"]', 'slides/community-ai-tips-minimal');
        await page.click('button:has-text("Load")');
        
        // Wait for a second for load
        await page.waitForTimeout(2000);
        
        // Check for error text
        const bodyText = await page.innerText('body');
        console.log(bodyText.substring(0, 1000));
        
        await browser.close();
    } catch (e) {
        console.log("Playwright Error", e);
    }
})();
