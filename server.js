const express = require("express");
const puppeteer = require("puppeteer");
const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs-extra");
const path = require("path");
const archiver = require("archiver");

const app = express();
const PORT = 3000;

app.use(express.static("public"));
app.use(express.json());

const downloadDir = path.join(__dirname, "downloads");
fs.ensureDirSync(downloadDir);

async function fetchWebsite(url) {
    const siteName = url.replace(/https?:\/\//, "").replace(/\W/g, "_");
    const websiteFolder = path.join(downloadDir, siteName);
    fs.ensureDirSync(websiteFolder);

    let browser;
    try {
        browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: "networkidle2" });

        const visitedLinks = new Set();
        const toVisit = [url];

        while (toVisit.length > 0) {
            const currentUrl = toVisit.pop();
            if (visitedLinks.has(currentUrl)) continue;
            visitedLinks.add(currentUrl);

            const res = await axios.get(currentUrl);
            const $ = cheerio.load(res.data);
            const relativePath = new URL(currentUrl).pathname.replace(/\/$/, "") || "index";
            const filePath = path.join(websiteFolder, `${relativePath}.html`);
            fs.ensureFileSync(filePath);
            fs.writeFileSync(filePath, $.html());

            // Find internal links
            $("a[href]").each((_, element) => {
                let href = $(element).attr("href");
                if (href.startsWith("/") || href.startsWith(url)) {
                    const fullUrl = new URL(href, url).href;
                    if (!visitedLinks.has(fullUrl)) toVisit.push(fullUrl);
                }
            });

            // Find CSS & JS files
            $("link[rel='stylesheet'], script[src]").each(async (_, element) => {
                let resourceUrl = $(element).attr("href") || $(element).attr("src");
                if (resourceUrl.startsWith("/")) resourceUrl = new URL(resourceUrl, url).href;
                if (!resourceUrl.includes(url)) return;

                try {
                    const resourceData = await axios.get(resourceUrl);
                    const resourcePath = path.join(websiteFolder, path.basename(resourceUrl));
                    fs.ensureFileSync(resourcePath);
                    fs.writeFileSync(resourcePath, resourceData.data);
                } catch (error) {
                    console.error(`Failed to fetch ${resourceUrl}:`, error);
                }
            });
        }

        await browser.close();

        // Zip the website folder
        const zipPath = path.join(downloadDir, `${siteName}.zip`);
        const output = fs.createWriteStream(zipPath);
        const archive = archiver("zip", { zlib: { level: 9 } });

        archive.pipe(output);
        archive.directory(websiteFolder, false);
        await archive.finalize();

        return `/downloads/${siteName}.zip`;
    } catch (error) {
        if (browser) await browser.close();
        throw error;
    }
}

app.post("/fetch", async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "No URL provided" });

    try {
        const zipFile = await fetchWebsite(url);
        res.json({ zipFile });
    } catch (error) {
        res.status(500).json({ error: "Error fetching website" });
    }
});

app.use("/downloads", express.static(downloadDir));

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
