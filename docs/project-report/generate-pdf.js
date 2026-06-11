const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
    console.log('Launching browser...');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const htmlPath = path.join(__dirname, 'project-report.html');
    const pdfPath = path.join(__dirname, 'Urban_Threads_Project_Report.pdf');

    // Load the HTML file
    console.log('Loading HTML...');
    await page.goto('file://' + htmlPath, { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Inject Paged.js polyfill for CSS Paged Media support (running headers, named pages, etc.)
    console.log('Injecting Paged.js polyfill...');
    await page.addScriptTag({ url: 'https://unpkg.com/pagedjs/dist/paged.polyfill.js' });

    // Wait for Paged.js to finish rendering
    console.log('Waiting for Paged.js to render pages...');
    await page.waitForFunction(() => {
        return window.PagedPolyfill && window.PagedPolyfill.chunker;
    }, { timeout: 60000 }).catch(() => {
        console.log('  Paged.js chunker not detected, using fallback wait...');
    });
    await page.waitForTimeout(8000); // Extra wait for complex layouts

    // Count pages
    const pageCount = await page.evaluate(() => {
        const pages = document.querySelectorAll('.pagedjs_page');
        return pages.length || 'unknown';
    });
    console.log(`Pages rendered: ${pageCount}`);

    // Check for low-content pages
    const lowContentPages = await page.evaluate(() => {
        const pages = document.querySelectorAll('.pagedjs_page');
        const low = [];
        pages.forEach((p, i) => {
            const text = p.querySelector('.pagedjs_page_content');
            if (text) {
                const textLen = text.innerText.trim().length;
                if (textLen < 100 && i > 0) { // Skip cover page
                    low.push({ page: i + 1, chars: textLen });
                }
            }
        });
        return low;
    });
    if (lowContentPages.length > 0) {
        console.log(`Low-content pages: ${JSON.stringify(lowContentPages)}`);
    } else {
        console.log('No low-content pages detected!');
    }

    // Generate PDF
    console.log('Generating PDF...');
    await page.pdf({
        path: pdfPath,
        preferCSSPageSize: true,
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });

    const stats = fs.statSync(pdfPath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(1);
    console.log(`\n✅ PDF generated: ${pdfPath}`);
    console.log(`   Size: ${sizeMB} MB`);
    console.log(`   Pages: ${pageCount}`);

    await browser.close();
})();
