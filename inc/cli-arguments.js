/**
 * All the cli arguments handling
 */

const commandLineArgs = require('command-line-args');
const getUsage = require('command-line-usage');
const { getValidDatePath } = require('./utils');

// Define command line args accepted.
const optionDefinitions = [
  {
    name: 'directory',
    type: String,
    defaultValue: getValidDatePath(new Date()),
    description: 'The directory name to save the screenshots in. *Required',
  },
  {
    name: 'urls',
    type: String,
    defaultValue: 'urls.txt',
    description:
      "The filename of the file containing the list of URLs to load. The default is 'urls.txt'.",
  },
  {
    name: 'authentication',
    type: String,
    defaultValue: false,
    description: 'The filename of the file containing authentication info if desired.',
  },
  {
    name: 'batchSize',
    type: Number,
    defaultValue: 10,
    description: 'The number of urls to process per batch.',
  },
  {
    name: 'notHeadless',
    type: Boolean,
    defaultValue: false,
    description: 'When specified it will not use headless mode. Default is false.',
  },
  {
    name: 'verbose',
    type: Boolean,
    defaultValue: false,
    description: 'Display additional program infomation. Default is false.',
  },
  {
    name: 'help',
    type: Boolean,
    description: 'Display this help screen.',
  },
];

// Parse command line args.
const options = commandLineArgs(optionDefinitions);

// Define the help screen to be displayed if --help is present in options
const usageDefinition = [
  {
    header: 'ScreenshotGrabberPlus',
    content:
      'Given a list of urls, this app grabs full page screenshots and console messages for each url',
  },
  {
    header: 'Options',
    optionList: optionDefinitions,
  },
];

// If --help is present, display the help screen and exit the program.
if (options.help) {
  console.log(getUsage(usageDefinition));
  process.exit();
}

// Export the options to be used.
module.exports = options;
