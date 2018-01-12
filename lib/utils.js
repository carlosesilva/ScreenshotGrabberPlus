const { URL } = require('url');
const fs = require('fs-extra');
const chalk = require('chalk');

/**
 * Returns a copy of the array with unique items only.
 *
 * @param {array} a - The array we want to remove duplicates from.
 * @return {array} - A copy of the array with unique items only.
 */
function uniq(a) {
  // Initialize the hashtable.
  const seen = {};
  // Filter the array.
  return a.filter((item) => {
    // If this item has already been seen before, filter it out.
    if (Object.prototype.hasOwnProperty.call(seen, item)) {
      return false;
    }
    // Add unique item to the hashtable.
    seen[item] = true;
    // Return true to keep the item.
    return true;
  });
}

/**
 * Reads urls from file into an array
 *
 * @param {string} urlsPath - The path to the file with the list of urls.
 * @return {array} - An array of urls.
 */
module.exports.readUrls = (urlsPath, verbose = false) => {
  // Check file exists first.
  if (!fs.existsSync(urlsPath)) {
    throw new Error(`The file ${urlsPath} does not exist.`);
  }

  // Grab list of urls from file.
  const rawUrls = fs
    .readFileSync(urlsPath)
    .toString()
    .split('\n');

  // Remove duplicates.
  const uniqueUrls = uniq(rawUrls);

  // Filter list of urls by only keeping valid ones.
  const filteredUrls = uniqueUrls.filter((url) => {
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
      if (verbose) {
        console.log(`Removing invalid URL: "${url}"`);
      }

      // Url was invalid return false.
      return false;
    }
  });

  // If there are no valid URLs, exit early.
  if (filteredUrls.length === 0) {
    throw new Error('No valid urls found.');
  }

  // Return the filtered urls list.
  return filteredUrls;
};

/**
 * Reads authentication info from json file
 *
 * @return {object|bool} - Returns an object if read in properly or false.
 */
module.exports.readAuthenticationInfo = (file) => {
  // Read json file in.
  const json = fs.readFileSync(file, 'utf8');
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
};

/**
 * Splits an array into an array of arrays of the specified chunk size
 *
 * @param {array} arr - The array we want to create chunks from.
 * @param {int} size - The chunk size.
 * @return {array} - The chunks.
 */
module.exports.getChunks = (arr, size) => {
  const arrCopy = arr.slice(0);
  const chunks = [];
  while (arrCopy.length > 0) {
    chunks.push(arrCopy.splice(0, size));
  }
  return chunks;
};

/**
 * Sanitizes the url to use as a directory name
 *
 * @param {string} url - The page url.
 * @return {string} - The sanitized directory name.
 */
module.exports.urlToDirectoryName = url => url.replace(/:\/\//g, '-').replace(/\//g, '%2F');

/**
 * Creates a directory if it does not exist
 *
 * @param {string} dir - The directory name.
 */
module.exports.createDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
  return dir;
};

/**
 * Formats date object so it is valid to use as a directory/file name
 *
 * @param {date} - The date object we want for format.
 * @return {string} - The formatted current datetime string.
 */
module.exports.getValidDatePath = (dateObj) => {
  // Get timezone offset and convert it from minutes to seconds
  const timezoneOffsetInSeconds = new Date().getTimezoneOffset() * 60 * 1000;
  // Subtract the timezone offset from the dateObj so that when we convert it to ISO
  // it will represent the local date time.
  const localISO = new Date(dateObj.getTime() - timezoneOffsetInSeconds).toISOString();
  // Format the iso string into a valid path name
  const formattedDate = localISO
    .substr(0, 19)
    .replace(/[-:]/g, '')
    .replace('T', '-');
  return formattedDate;
};

/**
 * Appends message to log file and console log it if specified
 *
 * @param {string} path - The file to append the log message.
 * @param {string} message - The message to be logged.
 * @param {boolean} consoleLogIt - Console.log the message
 */
module.exports.log = (path, message, skipConsoleLog = false) => {
  fs.appendFile(path, `${message}\n`);
  if (!skipConsoleLog) {
    console.log(message);
  }
};

module.exports.chalkRainbow = (str) => {
  const letters = str.split('');
  const colors = ['red', 'yellow', 'green', 'cyan', 'blue', 'magenta'];
  const colorsCount = colors.length;

  return letters
    .map((l, i) => {
      const color = colors[i % colorsCount];
      return chalk[color](l);
    })
    .join('');
};