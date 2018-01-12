# ScreenshotGrabberPlus (name can be changed)
## Table of contents
- [Requirements](#requirements)
- [How to use](#how-to-use)
- [Parameters](#parameters)
- [Authentication](#authentication)
  - [authentication-sample.json](#authentication-samplejson)
## Requirements

* Node.js v8.x or higher

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
| `authentication`        | Path to the authentication file. See more info about [authentication](#Authentication) below | Not set           |
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

For it to work, duplicate the [authentication-sample.json](/authentication-sample.json) file, replace the dummy information with your information and point to it when starting the program by using the authentication parameter

```
node index.js --authentication authentication.json
```

The browser will try to authenticate first and when it succeeds, it will start processing the list of urls.

### authentication-sample.json

| Property            | Description                                                                                   | Example              |
| ------------------- | --------------------------------------------------------------------------------------------- | -------------------- |
| `authenticationUrl` | The url for the authentication form                                                           | https://example.com  |
| `userFieldSelector` | The selector to target the username field                                                     | input[name=user]     |
| `passFieldSelector` | The selector to target the password field                                                     | input[name=password] |
| `submitSelector`    | The selector to target the submit button                                                      | input[type=submit]   |
| `successSelector`   | The selector to target an element that if found it confirms the authentication was successful | body.authenticated   |
| `user`              | The authentication username                                                                   | username             |
| `pass`              | The authentication password                                                                   | password             |
