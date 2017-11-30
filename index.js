const { readUrls } = require('./inc/utils');

// Require the ScreenshotGrabberPlus class.
const ScreenshotGrabberPlus = require('./inc/class-screenshot-grabber-plus');

// Grab the options from the cli arguments passed in to this program.
const options = require('./inc/cli-arguments');

// Start program.
(async () => {
  const urls = readUrls(options.urls, options.verbose);
  const screenshotGrabberPlus = new ScreenshotGrabberPlus(options, urls);
  await screenshotGrabberPlus.start();
})();
