const cp = require('child_process');
const {
  readUrls,
  readAuthenticationInfo,
  getChunks,
  createDir,
  log,
  chalkRainbow,
} = require('./inc/utils');

// Grab the options from the cli arguments passed in to this program.
const options = require('./inc/cli-arguments');

// Start main program.
(async () => {
  // Display program name.
  console.log(chalkRainbow('-----------------------'));
  console.log(chalkRainbow('Screenshot Grabber Plus'));
  console.log(chalkRainbow('-----------------------\n'));

  // Create the directory where we will keep all the screenshots.
  options.reportDirectory = createDir(`${createDir('./reports')}/${options.directory}`);

  // Construct log file path.
  options.logFile = `${options.reportDirectory}/log.txt`;

  // Read urls from file.
  const urls = readUrls(options.urls, options.verbose);

  // Divide urls into chunks for each subprocess
  // Since we don't want the chunk size to be smaller than options.batchSize
  // We will use the bigger of urls.length/numBrowsers and batchSize for the chunk size.
  const processUrlChunkSize = Math.max(
    Math.ceil(urls.length / options.numBrowsers),
    options.batchSize,
  );
  const processUrlChunks = getChunks(urls, processUrlChunkSize);

  // If authentication file is specified, add the info to the options object.
  if (options.authentication) {
    options.authenticationInfo = readAuthenticationInfo(options.authentication);
  }

  // Report initial stats.
  log(options.logFile, `Number of urls: ${urls.length}`);
  log(options.logFile, `Batch size: ${options.batchSize}`);
  log(options.logFile, `Number of batches: ${Math.ceil(urls.length / options.batchSize)}`);
  log(options.logFile, `Number of concurent browsers: ${processUrlChunks.length}\n`);

  // Capture start time.
  const startTime = Date.now();

  // Start a new child process for each chunk.
  const childPromises = processUrlChunks.map((processUrlChunk, index) =>
    new Promise((resolve, reject) => {
      // Fork a new child process.
      const child = cp.fork('./sub.js');

      // Listen for child events.
      child.on('error', reject);
      child.on('exit', reject);
      child.on('message', resolve);

      // Send message to start processing of urls.
      child.send({
        type: 'start_child',
        payload: { options: { ...options, browserIndex: index + 1 }, urls: processUrlChunk },
      });
    }));

  // Wait for all child promisses to complete.
  const results = await Promise.all(childPromises);

  // Capture end time.
  const endTime = Date.now();

  // Calculate performance stats.
  const totalTimeInSeconds = (endTime - startTime) / 1000;
  const pagesPerMinute = urls.length / (totalTimeInSeconds / 60);

  // Sum up the total number of page errors from all the child processes.
  const totalPageErrors = results.reduce(result => result.payload.pageErrors.length);

  // Display performance stats
  log(options.logFile, '\n');
  log(options.logFile, `Total time: ${totalTimeInSeconds.toFixed(2)} seconds`);
  log(options.logFile, `Speed: ${pagesPerMinute.toFixed(2)} URLs per minute`);
  log(options.logFile, `Total number of page failures: ${totalPageErrors}`);
  console.log(`See the log file for more information: ${options.logFile}`);
})();
