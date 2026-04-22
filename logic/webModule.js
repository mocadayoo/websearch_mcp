import { chromium } from 'playwright';
import pkgReadability from '@mozilla/readability';
const { Readability } = pkgReadability;
import isdomPkg from 'jsdom';
const { JSDOM } = isdomPkg;

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

async function websiteReader(url) {
    const content = await fetchWebsite(url);
    const dom = new JSDOM(content, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();
    return {
        title: article.title,
        content: article.textContent
    };
}

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

async function parallelWebsiteReader(urls) {
    const results = [];
    await Promise.all(urls.map(async (url) => {
        results.push(await websiteReader(url));
    }));
    return results;
}

async function parallelFetchWebsite(urls) {
    const results = [];
    await Promise.all(urls.map(async (url) => {
        results.push(await fetchWebsite(url));
    }));
    return results;
}

export { duckduckSearch, websiteReader, fetchWebsite, parallelWebsiteReader, parallelFetchWebsite };