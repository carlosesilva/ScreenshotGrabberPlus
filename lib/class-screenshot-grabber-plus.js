const fs = require('fs-extra');
const puppeteer = require('puppeteer');
const chalk = require('chalk');
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

    // Save authentication info into a local property.
    this.authentication = this.options.authenticationInfo;
    this.authenticationReAttemptsRemaining = 2;

    // Get list of urls.
    this.urls = urls;

    // Break list of urls into chunks.
    this.urlChunks = getChunks(this.urls, this.options['max-tabs']);

    // Initialize next chunk index to zero.
    this.nextChunk = 0;

    // Initialize array of page errors with an empty array.
    this.pageErrors = [];
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
    return (
      this.browser
        .newPage()
        .then(async (page) => {
          // Create directory for this url.
          const pageDirectoryName = urlToDirectoryName(url);
          const pageDirectoryPath = createDir(`${this.options.reportDirectory}/${pageDirectoryName}`);

          // Construct files paths.
          const consolePath = `${pageDirectoryPath}/console.txt`;
          const errorPath = `${pageDirectoryPath}/error.txt`;
          const screenshotPath = `${pageDirectoryPath}/screenshot.png`;

          // Log console messages.
          if (!this.options['skip-page-console-log']) {
            page.on('console', msg => fs.appendFile(consolePath, `${msg.text}\n`));
          }

          // Log console errors.
          if (!this.options['skip-page-error-log']) {
            page.on('pageerror', error => fs.appendFile(errorPath, `pageerror: ${error.stack}\n`));
            page.on('response', (response) => {
              if (!response.ok) {
                fs.appendFile(errorPath, `response: ${response.status} ${response.url}\n`);
              }
            });
            page.on('requestfailed', request =>
              fs.appendFile(
                errorPath,
                `requestfailed: ${request.failure().errorText} ${request.url}\n`,
              ));
          }

          // If either view port width or height was specified.
          if (this.options['viewport-width'] || this.options['viewport-height']) {
            // Get default viewport values.
            const defaultViewport = await page.viewport();
            // Apply defaults in case only one of the options (width or height) was specified.
            const viewportWidth = this.options['viewport-width'] || defaultViewport.width;
            const viewportHeight = this.options['viewport-height'] || defaultViewport.height;
            // Set the new viewport values.
            await page
              .setViewport({ width: viewportWidth, height: viewportHeight })
              .catch((error) => {
                this.browserLog(`There was an error setting the viewport size for ${url}`, true);
                this.browserLog(error, true);
              });
          }

          // Fetch page.
          await page
            .goto(url, { waitUntil: 'networkidle0' })
            .catch((error) => {
              // If error is just a timeout, log it and continue.
              if (error.message === 'Error: Navigation Timeout Exceeded: 30000ms exceeded') {
                if (!this.options['skip-page-error-log']) {
                  fs.appendFile(errorPath, `goto: ${error.message}\n`);
                }
              } else {
                // If error is not a timeout, let the error be thrown.
                throw error;
              }
            })
            // Await a few seconds extras for things to finish loading.
            .then(() => page.waitFor(5000))
            // Grab screenshot.
            .then(async () => {
              if (!this.options['skip-screenshot']) {
                await page.screenshot({
                  path: screenshotPath,
                  fullPage: true,
                });
              }
            })
            // Close the page.
            .then(() => page.close())
            // If everything went ok, display a checkmark with the url.
            .then(() => this.browserLog(`${chalk.green('\u2714')} ${url}`));
        })
        // Catch any errors and display an X with the url.
        .catch((error) => {
          this.pageErrors.push({
            url,
            error,
          });
          this.browserLog(`${chalk.red('\u2716')} ${url}`);
          this.browserLog(error, true);
        })
    );
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
   * Attempts to authenticate by login.
   *
   * @param {object} page The puppeteer page object
   * @return {Promise}
   */
  authByLogin(page) {
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

    this.browserLog('Starting authentication by login', true);

    // Fetch login page.
    return (
      page
        .goto(authenticationUrl, { waitUntil: 'networkidle2' })
        // Wait for login form.
        .then(() => page.waitFor(userFieldSelector))
        // Type username and password.
        .then(() => page.type(userFieldSelector, user))
        .then(() => page.type(passFieldSelector, pass))
        // Click the submit button.
        .then(() => page.click(submitSelector))
        // Confirm authentication was successful.
        .then(() => {
          this.browserLog('Authentication form submitted, waiting for authentication', true);
          return page.waitFor(successSelector);
        })
        // Close the page.
        .then(() => page.close())
        .then(() => ({ success: true, message: 'Athentication by login was successfull.' }))
        // Catch any errors during authentication.
        .catch(error => this.handleFailedAuthenticationByLogin(error))
    );
  }

  /**
   * Re-attempts to authenticate on authentication by login failure.
   *
   * @param {object} error - The error thrown by authenticate().
   */
  async handleFailedAuthenticationByLogin(error) {
    if (this.authenticationReAttemptsRemaining > 0) {
      // Decrement the number of authenticationReAttemptsRemaining.
      this.authenticationReAttemptsRemaining -= 1;
      this.browserLog(`Authentication failed. Attempting to authenticate again. (${
        this.authenticationReAttemptsRemaining
      } attempts remaining)`);
      // Re-attempt to authenticate.
      return this.authenticate();
    }
    // No re-authentication attempts remaining. Return the error.
    return { success: false, error };
  }

  /**
   * Attempts to authenticate by login.
   *
   * @param {object} page The puppeteer page object
   * @return {Promise}
   */
  authByCookie(page) {
    this.browserLog('Setting authentication cookies', true);
    return page
      .setCookie(...this.authentication.cookies)
      .then(() => ({ success: true, message: 'Authentication cookies were set successfully' }))
      .catch(error => ({ success: false, error }));
  }

  /**
   * Authenticates the browser before processing the urls.
   */
  async authenticate() {
    return this.browser.newPage().then(async (page) => {
      let auth;
      if (this.authentication.method === 'login') {
        auth = this.authByLogin(page);
      } else if (this.authentication.method === 'cookie') {
        auth = this.authByCookie(page);
      }
      return auth;
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
    this.browser = await puppeteer.launch({ headless: !this.options['not-headless'] });

    // If authentication information is present, authenticate it first.
    if (this.authentication) {
      const authenticationResult = await this.authenticate();
      if (authenticationResult.success === true) {
        this.browserLog(authenticationResult.message);
      } else {
        this.browserLog('Unable to authenticate.');
        this.browserLog(authenticationResult.error, true);
        throw new Error(authenticationResult.error);
      }
    }

    // Process all urls.
    await this.processBatchsRecursive();

    // Close the browser.
    this.browserLog('Ending', true);
    await this.browser.close();

    return { pageErrors: this.pageErrors };
  }
};
