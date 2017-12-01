const fs = require('fs-extra');
const puppeteer = require('puppeteer');
const {
  getChunks, urlToDirectoryName, createDir, log,
} = require('./utils');

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
    this.browserLog('There was an issue reading the authentication json file.');
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
      const pageDirectoryPath = createDir(`${this.options.reportDirectory}/${pageDirectoryName}`);

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
        this.browserLog(`\u2716 ${url}`);
        this.browserLog(error, true);
      });

      // Grab screenshot.
      await page
        .screenshot({
          path: screenshotPath,
          fullPage: true,
        })
        .then(() => this.browserLog(`\u2714 ${url}`));

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

    this.browserLog(`Starting batch #${this.nextChunk}`, true);
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
      this.browserLog('Starting authentication process', true);
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
          this.browserLog('Authentication form submitted, waiting for authentication', true);
          return page.waitFor(successSelector);
        })
        .then(() => this.browserLog('Authentication process successful\n', true))
        // Close the page.
        .then(() => page.close())
        .catch((error) => {
          this.browserLog('There was an error during authentication. See error below for more information.');
          this.browserLog(error);
          process.exit(1);
        });
    });
  }

  /**
   * Wrapper around the log util that adds the browser number to the message
   *
   * @param {string} m - The message to be logged.
   * @param {boolean} isVerbose - Whether this message is verbose or not.
   */
  browserLog(m, isVerbose = false) {
    // Prepend browser index to message
    const message = `Browser #${this.options.browserIndex}: ${m}`;
    const skipConsoleLog = isVerbose && !this.options.verbose;
    log(this.options.logFile, message, skipConsoleLog);
  }

  /**
   * Initializes and processes all urls.
   */
  async start() {
    // Launch the browser.
    this.browserLog('Starting', true);
    this.browser = await puppeteer.launch({ headless: !this.options.notHeadless });

    // If authetication information is present, authenticate it first.
    if (this.authentication) {
      await this.authenticate();
    }

    // Process all urls.
    await this.processBatchsRecursive();

    // Close the browser.
    this.browserLog('Ending', true);
    await this.browser.close();
  }
};
