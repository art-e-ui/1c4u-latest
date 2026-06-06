const fs = require('fs');
const path = require('path');

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist') walk(fullPath);
    } else {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      const replacements = [
        ['GlobalCart Online Shop', '1-CartForU'],
        ['GlobalCart', '1-CartForU'],
        ['globalcart-onlineshop.com', '1-cartforu.com'],
        ['globalcart.com', '1-cartforu.com']
      ];
      for (const [search, replace] of replacements) {
        if (content.includes(search)) {
          content = content.split(search).join(replace);
          changed = true;
        }
      }
      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

walk('./src');
