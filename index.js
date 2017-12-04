const cp = require('child_process');
const {
  readUrls,
  readAuthenticationInfo,
  getChunks,
  createDir,
  getValidDatePath,
  log,
  chalkRainbow,
} = require('./inc/utils');

// Grab the options from the cli arguments passed in to this program.
const options = require('./inc/cli-arguments');

// Capture start time.
const startDate = new Date();

// If no report directory was specified use start date.
if (!options.diretory) {
  options.directory = getValidDatePath(startDate);
}

// Keep track of all child processes we will be forking.
const childProcesses = [];

/**
 * Kill all child processes and exit the program.
 */
function exit() {
  console.log('\nClosing all browsers and exiting');
  console.log(`See the log file for more information: ${options.logFile}`);
  childProcesses.forEach(child => child.kill('SIGINT'));
  process.exit(1);
}

// On interrupt signal kill all subprocesses.
process.on('SIGINT', () => {
  exit();
});

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

  // Log the start time.
  log(options.logFile, `Start Time: ${startDate.toString()}`, true);

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

  // Start a new child process for each chunk.
  const childPromises = processUrlChunks.map((processUrlChunk, index) =>
    new Promise((resolve, reject) => {
      // Fork a new child process.
      const child = cp.fork('./sub.js');

      // Push new process to childProcesses array.
      childProcesses.push(child);

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
  const results = await Promise.all(childPromises).catch((error) => {
    log(options.logFile, 'There was an error within one of the child processes.');
    exit();
  });

  // Sum up the total number of page errors from all the child processes.
  const totalPageErrors = results.reduce(
    (sum, result) => sum + result.payload.pageErrors.length,
    0,
  );

  // Capture end time.
  const endDate = new Date();

  // Log end time
  log(options.logFile, `\nEnd Time: ${endDate.toString()}`, true);

  // Calculate performance stats.
  const totalTimeInSeconds = (endDate.getTime() - startDate.getTime()) / 1000;
  const pagesPerMinute = urls.length / (totalTimeInSeconds / 60);

  // Display performance stats
  log(options.logFile, '\n');
  log(options.logFile, `Total time: ${totalTimeInSeconds.toFixed(2)} seconds`);
  log(options.logFile, `Speed: ${pagesPerMinute.toFixed(2)} URLs per minute`);
  log(options.logFile, `Total number of page failures: ${totalPageErrors}`);
  console.log(`See the log file for more information: ${options.logFile}`);
})();
