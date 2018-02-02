const fs = require('fs-extra');
const path = require('path');

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };

  return text.replace(/[&<>"']/g, m => map[m]);
}

const getDirectories = source =>
  fs
    .readdirSync(source)
    .map(name => `./${path.join(source, name)}`)
    .filter(page => fs.lstatSync(page).isDirectory());

const getConsoleDiff = pagePath =>
  fs
    .readFile(`${pagePath}/console.diff`, 'utf8')
    .then((diff) => {
      const html = `<div class="console-diff"><h4>Console Diff</h4><pre><code class="diff">${escapeHtml(diff)}</code></pre></div>`;
      return html;
    })
    .catch((err) => {
      if (err.code !== 'ENOENT') {
        console.error(err);
      }
      return '';
    });

const getErrorDiff = pagePath =>
  fs
    .readFile(`${pagePath}/error.diff`, 'utf8')
    .then((diff) => {
      const html = `<div class="error-diff"><h4>Error Diff</h4><pre><code class="diff">${escapeHtml(diff)}</code></pre></div>`;
      return html;
    })
    .catch((err) => {
      if (err.code !== 'ENOENT') {
        console.error(err);
      }
      return '';
    });

const getScreenshotDiff = pagePath =>
  fs
    .access(`${pagePath}/screenshot.png`)
    .then(() => {
      const html = `<div class="screenshot-diff"><h4>Screenshot Diff</h4><p><a href="${pagePath}/screenshot.png" target="_blank" ><img src="${pagePath}/screenshot.png" /></a></p></div>`;
      return html;
    })
    .catch((err) => {
      if (err.code !== 'ENOENT') {
        console.error(err);
      }
      return '';
    });

const getReport = (pagePath) => {
  const diffPromises = [
    getScreenshotDiff(pagePath),
    getConsoleDiff(pagePath),
    getErrorDiff(pagePath),
  ];

  const report = Promise.all(diffPromises)
    .then((diffs) => {
      const diff = diffs.join('');
      if (diff !== '') {
        const html = `<article><header><h1>${decodeURIComponent(path.basename(pagePath))}</h1></header><section>${diff}</section></article>\n`;
        return html;
      }
      return '';
    })
    .catch((err) => {
      console.error(err);
      return '';
    });
  return report;
};

const source = './reports/library-prod-vs-library-upgrade';

const dirs = getDirectories(source);

const reportPromises = dirs.map(getReport);

Promise.all(reportPromises)
  .then((reports) => {
    const reportHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="ie=edge">
        <title>Document</title>
        <style>
          body {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px 15px;
          }
          img {
            max-width: 100%;
          }
        </style>
      </head>
      <body>  
        ${reports.join('')}
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/9.12.0/styles/default.min.css">
        <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/9.12.0/highlight.min.js"></script>
        <script>hljs.initHighlightingOnLoad();</script>
      </body>
      </html>
    `;
    return fs.writeFile('index.html', reportHtml);
  })
  .catch(err => console.error(err));
