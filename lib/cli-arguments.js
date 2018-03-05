/**
 * All the cli arguments handling
 */

const commandLineArgs = require('command-line-args');
const getUsage = require('command-line-usage');

// Define command line args accepted.
const optionDefinitions = [
  {
    name: 'directory',
    type: String,
    description: 'The directory name to save the screenshots in.',
  },
  {
    name: 'urls',
    type: String,
    defaultValue: 'urls.txt',
    description:
      "The filename of the file containing the list of URLs to load. The default is 'urls.txt'.",
  },
  {
    name: 'auth',
    type: String,
    defaultValue: false,
    description: 'The filename of the file containing authentication info if desired.',
  },
  {
    name: 'max-tabs',
    type: Number,
    defaultValue: 5,
    description: 'The maximum number of tabs open at the same time per browser.',
  },
  {
    name: 'max-browsers',
    type: Number,
    defaultValue: 4,
    description: 'The maximum number of browsers instances to open.',
  },
  {
    name: 'viewport-width',
    type: Number,
    description: 'Resize the viewport to the specified width in pixels.',
  },
  {
    name: 'viewport-height',
    type: Number,
    description: 'Resize the viewport to the specified height in pixels.',
  },
  {
    name: 'not-headless',
    type: Boolean,
    defaultValue: false,
    description: "Don't use headless mode.",
  },
  {
    name: 'skip-page-console-log',
    type: Boolean,
    defaultValue: false,
    description: 'Skip the capture of console messages found in page.',
  },
  {
    name: 'skip-page-error-log',
    type: Boolean,
    defaultValue: false,
    description: 'Skip the capture of console errors found in page.',
  },
  {
    name: 'do-not-include-host',
    type: Boolean,
    defaultValue: false,
    description:
      "Don't include the host in the directory name. Only use this when your urls are all coming from the same host. This is useful for comparing different enviroments such as Devl, Staging, Prod.",
  },
  {
    name: 'verbose',
    type: Boolean,
    defaultValue: false,
    description: 'Display additional program infomation.',
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
