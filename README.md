# ScreenshotGrabberPlus (name can be changed)

Capture screenshots and console messages for multiple urls. You can also compare 2 sets of data to find any changes.

## Table of contents

* [What does it do](#what-does-it-do)
* [Requirements](#requirements)
* [How to use](#how-to-use)
* [Parameters](#parameters)
* [Authentication](#authentication)
  * [authentication-sample.json](#authentication-samplejson)
* [Comparing 2 reports](#comparing-2-reports)
* [Tips on generating list of URLS](#tips-on-generating-list-of-urls)
* [Changelog](#changelog)

## What does it do

You give a .txt file with a list of urls to the program and for each url it will:

* Open the url in a headless chrome browser instance and wait for it load.
* Capture a screenshot into a .png file.
* Capture the contents of the browser console into a .txt file.

The results can be found inside the reports folder.

It is able to achieve fast speeds by loading the urls into multiple tabs inside multiple browsers at the same time. (This can be hardware intensive but you can specify limits for the number of tabs and browsers to best fit your computer's capabilities).

It is also capable of authenticating before visiting the urls so that you can capture pages that are not open to the public. See [authentication](#authentication) below for more information on that.

## Requirements

* Node.js v8.3 or higher
* ImageMagick (only required for the [compare functionality](#comparing-2-reports))

## How to use

1. Clone this repo
2. Go into its directory using your favorite terminal program

```
$ cd path/to/repo
```

3. Install npm packages

```
$ npm install
```

4. Create a .txt file with the urls you want to process (one per line).

```
https://google.com
https://bing.com
https://yahoo.com
```

5. Run the program

```
$ node index.js --urls=urls.txt
```

## Parameters

| Parameter               | Description                                                                                  | Default           |
| ----------------------- | -------------------------------------------------------------------------------------------- | ----------------- |
| `directory`             | The directory name to save the screenshots in.                                               | Current date time |
| `urls`                  | Path to file with the list of urls                                                           | `'urls.txt'`      |
| `auth`                  | Path to the authentication file. See more info about [authentication](#authentication) below | Not set           |
| `max-tabs`              | The maximum number of tabs allowed to open at the same time per browser.                     | `5`               |
| `max-browsers`          | The maximum number of browsers instances allowed to open at the same time.                   | `4`               |
| `viewport-width`        | Specify a custom viewport width in pixels.                                                   | 800               |
| `viewport-height`       | Specify a custom viewport height in pixels.                                                  | 600               |
| `not-headless`          | If set to true, the browser will not open in headless mode                                   | Not set           |
| `skip-page-console-log` | Skip the capture of console messages found in page.                                          | Not set           |
| `skip-page-error-log`   | Skip the capture of console errors found in page.                                            | Not set           |
| `verbose`               | Display additional program infomation.                                                       | Not set           |
| `help`                  | Display the help screen.                                                                     | Not set           |

## Authentication

This tool is able to authenticate via a simple username/password form page.

For it to work, duplicate the [authentication-sample.json](/authentication-sample.json) file, replace the dummy information with your information and point to it when starting the program by using the auth parameter

```
node index.js --auth authentication.json
```

The browser will try to authenticate first and when it succeeds, it will start processing the list of urls.

### authentication-sample.json

| Property            | Description                                                                                                | Example              |
| ------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------- |
| `authenticationUrl` | The url for the authentication form                                                                        | https://example.com  |
| `userFieldSelector` | The selector to target the username field                                                                  | input[name=user]     |
| `passFieldSelector` | The selector to target the password field                                                                  | input[name=password] |
| `submitSelector`    | The selector to target the submit button                                                                   | input[type=submit]   |
| `successSelector`   | The selector to target an element that if found it confirms the authentication was successful              | body.authenticated   |
| `user`              | The authentication username                                                                                | username             |
| `pass`              | The authentication password (Note: you may omit this property and you will be prompted for it at runtime ) | password             |

## Comparing 2 reports

You can compare two reports to find any changes to pages that may have occured after some action such as updating your CMS, updating a NPM package or even an event like the Y2k.

Use the [compare.sh](/compare.sh) script to visualy compare the screenshots and diff the console messages/errors.

```
$ bash compare.sh <path/to/report1> <path/to/report2>
```

### Example:

```
$ node index.js --directory 1999
$ node index.js --directory 2000
$ bash compare.sh ./report/1999 ./report/2000
```

Note: You need to have [ImageMagick](https://www.imagemagick.org) installed on your computer. The easiest way to install on a mac is to use [Homebrew](http://brew.sh/)

```
$ brew install imagemagick
```

## Tips on generating list of URLS

### WordPress

It is easy to generate a list of URLs for a WordPress site through [wp-cli](http://wp-cli.org/).

```
# List post types registered on a site
wp --url=www.example.com/ post-type list
# List permalinks for the found post types.
wp --url=www.example.com/ post list --fields=url --post_type=post,page --post_status=publish --format=csv | tail -n +2
```

### Google Analytics

To get a list of popular sites or URLs, check the Google Analytics account under Reports > Behavior > Content Drilldown and use Export into CSV. Then copy the list of urls from the .csv file into a .txt file (one url per line).

## Changelog

### v0.2.0

Added script to compare 2 sets of data.
