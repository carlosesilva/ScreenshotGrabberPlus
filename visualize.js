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
      const html = `<pre><code class="diff">${escapeHtml(diff)}</code></pre>`;
      return html;
    })
    .catch((err) => {
      console.error(err);
      return '';
    });

const getScreenshotDiff = pagePath =>
  fs
    .access(`${pagePath}/screenshot.png`)
    .then(() => {
      const html = `<a href="${pagePath}/screenshot.png" target="_blank" ><img src="${pagePath}/screenshot.png" /></a>`;
      return html;
    })
    .catch((err) => {
      console.error(err);
      return '';
    });

const getReport = (pagePath) => {
  const screenshotDiff = getScreenshotDiff(pagePath).then((img) => {
    if (img !== '') {
      return `<div class="screenshot-diff"><h4>Screenshot Diff</h4><p>${img}</p></div>`;
    }
    return '';
  });
  const consoleDiff = getConsoleDiff(pagePath).then((code) => {
    if (code !== '') {
      return `<div class="console-diff"><h4>Console Diff</h4>${code}</div>`;
    }
    return '';
  });
  const report = Promise.all([screenshotDiff, consoleDiff])
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
