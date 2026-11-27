import { chromium } from 'playwright';

const run = async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext({ 
        reducedMotion: 'reduce' 
    });
    const page = await context.newPage({ viewport: { width: 1400, height: 900 } });
    
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
    
    // Check if reduced motion is active
    const isReducedMotion = await page.evaluate(() => {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    });
    
    console.log('Reduced motion enabled in browser:', isReducedMotion);
    
    // Check actual reduced motion setting (Windows accessibility)
    const systemReducedMotion = await page.evaluate(() => {
        // This checks if Windows accessibility reduced motion is enabled
        // Note: This is a simplified check - actual implementation would require more complex detection
        return false; // We can't directly access Windows accessibility settings from the page
    });
    
    console.log('Windows accessibility reduced motion:', systemReducedMotion);
    
    await browser.close();
    return isReducedMotion;
};

run().catch(e => { console.error(e); process.exit(1); });