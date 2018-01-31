/**
 * Subroutine for running in multiprocessing.
 */

// Require the ScreenshotGrabberPlus class.
const ScreenshotGrabberPlus = require('./lib/class-screenshot-grabber-plus');

/**
 * Start subroutine
 *
 * @param {object} options - The program options.
 * @param {array} urls - The urls to be processed.
 * @return {Promise}
 */
function start(options, urls) {
  // Instantiate the ScreenshotGrabberPlus class with the options and urls.
  const screenshotGrabberPlus = new ScreenshotGrabberPlus(options, urls);
  // Start async processing and wait for it to finish.
  return screenshotGrabberPlus
    .start()
    .then((result) => {
      // Send a message to parent saying we are done.
      process.send({
        type: 'child_done',
        payload: { browserIndex: options.browserIndex, result },
      });
    })
    .then(() => {
      // Exit the child process
      process.exit();
    })
    .catch((error) => {
      // Send a message to parent saying there was an error.
      process.send({
        type: 'child_error',
        payload: { browserIndex: options.browserIndex, error: error.message },
      });

      // Exit the child process with error code.
      process.exit(1);
    });
}

// Wait for message from parent process to start the url processing.
process.on('message', (m) => {
  switch (m.type) {
    case 'start_child':
      start(m.payload.options, m.payload.urls);
      return;
    default:
      throw new Error('Unknown message type');
  }
});
