const { URL } = require('url');
const fs = require('fs-extra');
const puppeteer = require('puppeteer');

// Grab the options from the cli arguments passed in to this program.
const input = require('./inc/cli-arguments');

class ScreenshotGrabberPlus {
  constructor(options) {
    // Save the program options into a local property.
    this.options = options;

    // Get list of urls.
    this.urls = this.readUrls(this.options.urls);

    // Break list of urls into chunks.
    this.urlChunks = ScreenshotGrabberPlus.getChunks(this.urls, this.options.batchSize);

    // Initialize next chunk index to zero.
    this.nextChunk = 0;
  }

  /**
   * Read urls from file into an array
   *
   * @param {string} urlsPath - The path to the file with the list of urls.
   * @return {array} - An array of urls.
   */
  readUrls(urlsPath) {
    // Grab list of urls from file.
    const rawUrls = fs
      .readFileSync(urlsPath)
      .toString()
      .split('\n');

    // Filter list of urls by only keeping valid ones.
    const filteredUrls = rawUrls.filter((url) => {
      // Ignore empty lines.
      if (url === '') {
        return false;
      }
      // Try to transform url into a URL object.
      // It will throw an error if it is not valid.
      try {
        const validUrl = new URL(url);
        // No error was thrown so url is valid, lets keep it.
        return validUrl;
      } catch (error) {
        // Display error message if verbose is on.
        if (this.options.verbose) {
          console.log(`Removing invalid URL: "${url}"`);
        }

        // Url was invalid return false.
        return false;
      }
    });

    // If there are no valid URLs, exit early.
    if (filteredUrls.length === 0) {
      console.log('No valid urls found.');
      process.exit();
    }

    // Return the filtered urls list.
    return filteredUrls;
  }

  /**
   * Get the next chunk of urls to be processed
   *
   * @return {array} - The next chunk of urls to be processed.
   */
  getNextChunk() {
    const chunk = this.urlChunks[this.nextChunk];
    this.nextChunk += 1;
    return chunk;
  }

  /**
   * Launches a new page given an url and captures info about the page
   *
   * @param {string} url - The page url.
   * @return {Promise} - A promise that doesn't return anything.
   */
  grabScreenshot(url) {
    return this.browser.newPage().then(async (page) => {
      // Create directory for this url.
      const pageDirectoryName = ScreenshotGrabberPlus.urlToDirectoryName(url);
      const pageDirectoryPath = `${this.directory}/${pageDirectoryName}`;
      if (!fs.existsSync(pageDirectoryPath)) {
        fs.mkdirSync(pageDirectoryPath);
      }
      // Construct files paths.
      const consolePath = `${pageDirectoryPath}/console.txt`;
      const screenshotPath = `${pageDirectoryPath}/screenshot.png`;

      // Remove exisiting console file because we append to it so we don't want any previous stuff.
      if (fs.existsSync(consolePath)) {
        fs.unlinkSync(consolePath);
      }

      // Add event listener for console messages. Append it to a txt file.
      page.on('console', msg => fs.appendFile(consolePath, `${msg.text}\n`));

      // Fetch page.
      await page.goto(url, { waitUntil: 'load' }).catch((error) => {
        console.log(`Error: ${url}`);
        if (this.options.verbose) {
          console.log(error);
        }
      });

      // Grab screenshot.
      await page
        .screenshot({
          path: screenshotPath,
          fullPage: true,
        })
        .then(() => console.log(`Success: ${url}`));

      // Close the page.
      await page.close();
    });
  }

  /**
   * Processes a single batch of urls
   *
   * @param {array} urlBatch - A batch of urls to process.
   * @return {Promise} - A promise.all of each call to grabScreenshot.
   */
  processBatch(urlBatch) {
    // Keep list of page promises.
    const promises = [];

    console.log(`Starting batch #${this.nextChunk}`);
    // Iterate over urls and launch a new page for each one.
    urlBatch.forEach((url) => {
      promises.push(this.grabScreenshot(url));
    });

    // Wait for all promises to be done.
    return Promise.all(promises);
  }

  /**
   * Recursively process all batches
   */
  async processBatchsRecursive() {
    const chunk = this.getNextChunk();
    if (!chunk) {
      return true;
    }
    await this.processBatch(chunk);
    return this.processBatchsRecursive();
  }

  /**
   * Creates a directory
   *
   * @param {string} dir - The directory name.
   */
  static createDir(dir) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    return dir;
  }

  /**
   * Splits an array into an array of chunks
   *
   * @param {array} arr - The array we want to create chunks from.
   * @param {int} size - The chunk size.
   * @return {array} - The chunks.
   */
  static getChunks(arr, size) {
    const arrCopy = arr.slice(0);
    const chunks = [];
    while (arrCopy.length > 0) {
      chunks.push(arrCopy.splice(0, size));
    }
    return chunks;
  }

  /**
   * Sanitizes the url to use as a directory name
   *
   * @param {string} url - The page url.
   * @return {string} - The sanitized directory name.
   */
  static urlToDirectoryName(url) {
    return url.replace(/:\/\//g, '-').replace(/\//g, '%2F');
  }

  /**
   * Initializes and processes all urls.
   */
  async start() {
    // Create the directory where we will keep all the screenshots.
    this.directory = ScreenshotGrabberPlus.createDir(`./reports/${this.options.directory}`);

    // Launch the browser.
    console.log('Starting program');
    console.log(`Number of urls: ${this.urls.length}`);
    console.log(`Batch size: ${this.options.batchSize}`);
    console.log(`Number of batches: ${this.urlChunks.length}\n`);

    this.browser = await puppeteer.launch({ headless: false });

    // Capture start time.
    const startTime = Date.now();

    // Process all urls.
    await this.processBatchsRecursive();

    // Capture end time.
    const endTime = Date.now();

    // Display stats.
    const totalTimeInSeconds = (endTime - startTime) / 1000;
    const pagesPerMinute = this.urls.length / (totalTimeInSeconds / 60);
    console.log(`Total time: ${totalTimeInSeconds} seconds`);
    console.log(`"Speed: ${pagesPerMinute} URLs per minute`);

    // Close the browser.
    console.log('Ending Program');
    await this.browser.close();
  }
}
// Instantiate the class.
const screenshotGrabberPlus = new ScreenshotGrabberPlus(input);

// Start program.
(async () => {
  await screenshotGrabberPlus.start();
})();
