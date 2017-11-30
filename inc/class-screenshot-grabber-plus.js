const fs = require('fs-extra');
const puppeteer = require('puppeteer');
const { getChunks, urlToDirectoryName, createDir } = require('./utils');

/**
 * Class ScreenshotGrabberPlus
 */
module.exports = class ScreenshotGrabberPlus {
  constructor(options, urls) {
    // Save the program options into a local property.
    this.options = options;

    // Read authentication info into a local property.
    this.authentication = this.readAuthenticationInfo();

    // Get list of urls.
    this.urls = urls;

    // Break list of urls into chunks.
    this.urlChunks = getChunks(this.urls, this.options.batchSize);

    // Initialize next chunk index to zero.
    this.nextChunk = 0;
  }

  /**
   * Reads authentication info if specified in options.
   *
   * @return {object|bool} - Returns an object if read in properly or false.
   */
  readAuthenticationInfo() {
    // If authentication file is not specified return false.
    if (!this.options.authentication) {
      return false;
    }

    // Read json file in.
    const json = fs.readFileSync(this.options.authentication, 'utf8');
    if (json) {
      // Parse the json string.
      const authentication = JSON.parse(json);
      if (authentication) {
        // Return the authentication object.
        return authentication;
      }
    }

    // There was an issue reading the authentication json file.
    console.log('There was an issue reading the authentication json file.');
    return false;
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
      const pageDirectoryName = urlToDirectoryName(url);
      const pageDirectoryPath = createDir(`${this.reportDirectory}/${pageDirectoryName}`);

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
    // Get next chunk of urls.
    const chunk = this.getNextChunk();

    // If there are no more chunks to process, exit the recursion by returning true.
    if (!chunk) {
      return true;
    }

    // Process the current batch of urls.
    await this.processBatch(chunk);

    // Process the next batch of urls.
    return this.processBatchsRecursive();
  }

  /**
   * Authenticates before batch processing the urls.
   */
  async authenticate() {
    return this.browser.newPage().then(async (page) => {
      // Destructure values from this.authentication.
      const {
        authenticationUrl,
        userFieldSelector,
        passFieldSelector,
        submitSelector,
        successSelector,
        user,
        pass,
      } = this.authentication;

      // Fetch login page.
      console.log('Starting authentication process');
      await page
        .goto(authenticationUrl, { waitUntil: 'load' })
        // Wait for login form.
        .then(() => page.waitFor(userFieldSelector))
        // Type username and password.
        .then(() => page.type(userFieldSelector, user))
        .then(() => page.type(passFieldSelector, pass))
        // Click the submit button.
        .then(() => page.click(submitSelector))
        .then(() => {
          console.log('Authentication form submitted, waiting for authentication');
          return page.waitFor(successSelector);
        })
        .then(() => console.log('Authentication process successful\n'))
        // Close the page.
        .then(() => page.close())
        .catch((error) => {
          console.log('Error: There was an error during authentication. See error below for more information.');
          console.log(error);
          process.exit(1);
        });
    });
  }

  /**
   * Initializes and processes all urls.
   */
  async start() {
    // Create the directory where we will keep all the screenshots.

    this.reportDirectory = createDir(`${createDir('./reports')}/${this.options.directory}`);

    // Launch the browser.
    console.log('Starting program');
    console.log(`Number of urls: ${this.urls.length}`);
    console.log(`Batch size: ${this.options.batchSize}`);
    console.log(`Number of batches: ${this.urlChunks.length}\n`);
    this.browser = await puppeteer.launch({ headless: !this.options.notHeadless });

    // If authetication information is present, authenticate it first.
    if (this.authentication) {
      await this.authenticate();
    }

    // Capture start time.
    const startTime = Date.now();

    // Process all urls.
    await this.processBatchsRecursive();

    // Capture end time.
    const endTime = Date.now();

    // Display stats.
    const totalTimeInSeconds = (endTime - startTime) / 1000;
    const pagesPerMinute = this.urls.length / (totalTimeInSeconds / 60);
    console.log(`\nTotal time: ${totalTimeInSeconds} seconds`);
    console.log(`Speed: ${pagesPerMinute} URLs per minute`);

    // Close the browser.
    console.log('Ending Program');
    await this.browser.close();
  }
};
