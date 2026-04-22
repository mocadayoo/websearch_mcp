import { chromium } from 'playwright';

async function duckduckSearch(query) {
    query = encodeURIComponent(query);

    const browser = await chromium.launch({
        args: ['--disable-blink-features=AutomationControlled'],
        headless: false
    });
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`https://duckduckgo.com/?q=${query}&ia=web`, { timeout: 30000 });
    const results = await page.locator('li[data-layout="organic"] > article[data-testid="result"]').all();

    const search_results = [];
    for (const result of results) {
        try {
            const url_locator = result.locator('a[data-testid="result-title-a"]');
            const title = await url_locator.locator('span').textContent();
            const url = await url_locator.getAttribute('href');
            const summary = (await result.locator('div[data-result="snippet"] > div > span > span').allTextContents()).join();

            search_results.push({
                title,
                url,
                summary
            });
        } catch (e) {
            console.error('Error parsing result:', e.message);
        }
    }

    await browser.close();
    return search_results;
};

async function fetchWebsite(url) {
    const browser = await chromium.launch({
        args: ['--disable-blink-features=AutomationControlled'],
        headless: false
    });
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(url, { timeout: 30000 });

    const content = await page.content();

    await browser.close();
    return content;
}

export { duckduckSearch, fetchWebsite };