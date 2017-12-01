const cp = require('child_process');
const {
  readUrls, getChunks, createDir, log,
} = require('./inc/utils');

// Grab the options from the cli arguments passed in to this program.
const options = require('./inc/cli-arguments');

// Start main program.
(async () => {
  // Create the directory where we will keep all the screenshots.
  options.reportDirectory = createDir(`${createDir('./reports')}/${options.directory}`);

  // Construct log file path.
  options.logFile = `${options.reportDirectory}/log.txt`;

  log(options.logFile, 'Starting main program\n');

  // Read urls from file.
  const urls = readUrls(options.urls, options.verbose);

  // Divide urls into chunks for each subprocess/
  const processUrlChunkSize = Math.ceil(urls.length / options.numBrowsers);
  const processUrlChunks = getChunks(urls, processUrlChunkSize);

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
  await Promise.all(childPromises);

  // Capture end time.
  const endTime = Date.now();

  // Calculate performance stats.
  const totalTimeInSeconds = (endTime - startTime) / 1000;
  const pagesPerMinute = urls.length / (totalTimeInSeconds / 60);

  // Display performance stats
  log(options.logFile, '\nEnding main program');
  log(options.logFile, `Total time: ${totalTimeInSeconds} seconds`);
  log(options.logFile, `Speed: ${pagesPerMinute} URLs per minute`);
})();
