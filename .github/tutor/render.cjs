const path = require('node:path');
const nunjucks = require('nunjucks');

const templates = new nunjucks.Environment(
  new nunjucks.FileSystemLoader(path.resolve(__dirname, '../..')),
  { autoescape: false, throwOnUndefined: true },
);

function render(file, values) {
  return templates.render(file, values).replace(
    /\.\.\/images\/([^\s)"']+)/g,
    `https://github.com/${values.full_repo_name}/blob/main/.github/images/$1?raw=true`,
  );
}

module.exports = { render };
