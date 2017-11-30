// Require the ScreenshotGrabberPlus class.
const ScreenshotGrabberPlus = require('./inc/class-screenshot-grabber-plus');

// Grab the options from the cli arguments passed in to this program.
const options = require('./inc/cli-arguments');

// Instantiate the class.
const screenshotGrabberPlus = new ScreenshotGrabberPlus(options);

// Start program.
(async () => {
  await screenshotGrabberPlus.start();
})();
