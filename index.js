const fs = require('fs-extra');
const puppeteer = require('puppeteer');

// Grab list of urls.
const urls = fs
  .readFileSync('urls.txt')
  .toString()
  .split('\n');

// Create the screenshots folder.
const screenshotsPath = './screenshots';
if (!fs.existsSync(screenshotsPath)) {
  fs.mkdirSync(screenshotsPath);
}

/**
 * Sanitizes the url to use as a directory name
 *
 * @param {string} url - The page url.
 * @return {string} - The sanitized directory name.
 */
const urlToDirectoryName = url => url.replace(/\:\/\//g, '-').replace(/\//g, '%2F');

/**
 * Launches a new page given an url and captures info about the page
 *
 * @param {object} browser - The puppeteer browser instance.
 * @param {string} url - The page url.
 * @return {Promise} - A promise that doesn't return anything.
 */
const grabScreenshot = (browser, url) =>
  browser.newPage().then(async (page) => {
    // Create directory for this url.
    const directoryName = urlToDirectoryName(url);
    const directoryPath = `${screenshotsPath}/${directoryName}`;
    if (!fs.existsSync(directoryPath)) {
      fs.mkdirSync(directoryPath);
    }
    // Construct files paths.
    const consolePath = `${directoryPath}/console.txt`;
    const screenshotPath = `${directoryPath}/screenshot.png`;

    // Remove exisiting console file because we append to it so we don't want any previous stuff.
    if (fs.existsSync(consolePath)) {
      fs.unlinkSync(consolePath);
    }

    // Add event listener for console messages. Append it to a txt file.
    page.on('console', msg => fs.appendFile(consolePath, `${msg.text}\n`));

    // Fetch page.
    await page.goto(url, { waitUntil: 'load' });

    // Grab screenshot.
    await page
      .screenshot({
        path: screenshotPath,
        fullPage: true,
      })
      .then(() => console.log(`Screenshot for ${url} saved!`));

    // Close the page.
    await page.close();
  });

// Launch the browser.
console.log('Starting browser');
puppeteer.launch().then(async (browser) => {
  // Keep list of page promises.
  const promises = [];

  // Iterate over urls and launch a new page for each one.
  urls.forEach((url, i) => {
    promises.push(grabScreenshot(browser, url));
  });

  // Wait for all promises to be done.
  await Promise.all(promises);

  // Close the browser.
  await browser.close();
});
