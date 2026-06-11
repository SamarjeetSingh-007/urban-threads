const { chromium } = require('playwright');
const path = require('path');

const SITE = 'https://urban-threads-theta.vercel.app';
const DIR = path.join(__dirname, 'images', 'screenshots');

const pages_to_capture = [
    { name: 'homepage', url: '/' },
    { name: 'shop', url: '/shop.html' },
    { name: 'login', url: '/login.html' },
    { name: 'signup', url: '/signup.html' },
    { name: 'about', url: '/about.html' },
    { name: 'contact', url: '/contact.html' },
    { name: 'cart', url: '/cart.html' },
    { name: 'wishlist', url: '/wishlist.html' },
];

(async () => {
    const browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();

    // Capture all public pages
    for (const p of pages_to_capture) {
        try {
            console.log(`Capturing ${p.name}...`);
            await page.goto(SITE + p.url, { waitUntil: 'load', timeout: 20000 });
            await page.waitForTimeout(3000);
            await page.screenshot({ path: path.join(DIR, p.name + '.png'), fullPage: false });
            console.log(`  ✓ ${p.name}.png`);
        } catch(e) {
            console.log(`  ✗ ${p.name}: ${e.message.split('\n')[0]}`);
        }
    }

    // Admin screenshots
    console.log('\nAdmin panel...');
    try {
        // Go to admin page (will redirect to login)
        await page.goto(SITE + '/admin.html', { waitUntil: 'load', timeout: 20000 });
        await page.waitForTimeout(2000);
        
        // Take admin login screenshot
        await page.screenshot({ path: path.join(DIR, 'admin_login.png'), fullPage: false });
        console.log('  ✓ admin_login.png');

        // Login as admin
        const emailInput = await page.$('input[type="email"]') || await page.$('#email') || await page.$('input[name="email"]');
        const passInput = await page.$('input[type="password"]') || await page.$('#password') || await page.$('input[name="password"]');
        
        if (emailInput && passInput) {
            await emailInput.fill('admin@urbanthreads.com');
            await passInput.fill('admin12345');
            
            const submitBtn = await page.$('button[type="submit"]') || await page.$('.btn-primary') || await page.$('form button');
            if (submitBtn) {
                await submitBtn.click();
                console.log('  Clicked login...');
                await page.waitForTimeout(5000);
                
                console.log('  URL after login:', page.url());
                
                // Check if we're on admin page
                if (page.url().includes('admin')) {
                    await page.waitForTimeout(3000);
                    await page.screenshot({ path: path.join(DIR, 'admin_dashboard.png'), fullPage: false });
                    console.log('  ✓ admin_dashboard.png');
                    
                    // Full page
                    await page.screenshot({ path: path.join(DIR, 'admin_full.png'), fullPage: true });
                    console.log('  ✓ admin_full.png');
                    
                    // Settings tab
                    const settingsTab = await page.$('text=SETTINGS') || await page.$('[data-tab="settings"]');
                    if (settingsTab) {
                        await settingsTab.click();
                        await page.waitForTimeout(2000);
                        await page.screenshot({ path: path.join(DIR, 'admin_settings.png'), fullPage: false });
                        console.log('  ✓ admin_settings.png');
                    } else {
                        console.log('  ⚠ No settings tab found, trying JS click...');
                        await page.evaluate(() => {
                            const tabs = document.querySelectorAll('[role="tab"], .tab, button');
                            for (const t of tabs) {
                                if (t.textContent.includes('SETTINGS') || t.textContent.includes('Settings')) {
                                    t.click();
                                    break;
                                }
                            }
                        });
                        await page.waitForTimeout(2000);
                        await page.screenshot({ path: path.join(DIR, 'admin_settings.png'), fullPage: false });
                        console.log('  ✓ admin_settings.png (via JS click)');
                    }
                } else {
                    console.log('  ⚠ Not on admin page after login. URL:', page.url());
                    await page.screenshot({ path: path.join(DIR, 'admin_after_login.png'), fullPage: false });
                }
            }
        } else {
            console.log('  ⚠ Could not find login form inputs');
        }
    } catch(e) {
        console.log('  ✗ Admin error:', e.message.split('\n')[0]);
    }

    await browser.close();
    console.log('\nDone!');
    
    // List captured files
    const fs = require('fs');
    const files = fs.readdirSync(DIR).filter(f => f.endsWith('.png'));
    console.log(`\nCaptured ${files.length} screenshots:`);
    files.forEach(f => {
        const stat = fs.statSync(path.join(DIR, f));
        console.log(`  ${f} (${(stat.size/1024).toFixed(0)} KB)`);
    });
})();
