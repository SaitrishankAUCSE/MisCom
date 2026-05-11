const fs = require('fs');
const path = require('path');

const dir = './src/pages';
const compDir = './src/components';

function processFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Replace custom spacing classes with standard tailwind numeric spacing
  // xs: 0.5rem (2)
  // sm: 1rem (4)
  // md: 1.5rem (6)
  // lg: 2.5rem (10)
  // xl: 4rem (16)
  // unit: 4px (1)
  
  const replacements = [
    { regex: /([a-z]+)-xs\b/g, val: '$1-2', exclude: /max-w-xs/ },
    { regex: /([a-z]+)-sm\b/g, val: '$1-4', exclude: /max-w-sm|text-sm|rounded-sm|shadow-sm|backdrop-blur-sm|blur-sm/ },
    { regex: /([a-z]+)-md\b/g, val: '$1-6', exclude: /max-w-md|text-md|rounded-md|shadow-md|backdrop-blur-md|blur-md/ },
    { regex: /([a-z]+)-lg\b/g, val: '$1-10', exclude: /max-w-lg|text-lg|rounded-lg|shadow-lg|backdrop-blur-lg|blur-lg/ },
    { regex: /([a-z]+)-xl\b/g, val: '$1-16', exclude: /max-w-xl|text-xl|rounded-xl|shadow-xl|backdrop-blur-xl|blur-xl/ },
    { regex: /([a-z]+)-unit\b/g, val: '$1-1', exclude: /null/ }
  ];

  replacements.forEach(({ regex, val, exclude }) => {
    content = content.replace(regex, (match, prefix) => {
      if (exclude.test(match)) return match;
      if (['text', 'font', 'rounded', 'shadow', 'blur', 'max'].includes(prefix)) return match; // extra safety
      return prefix + '-' + val.split('-')[1];
    });
  });

  fs.writeFileSync(filePath, content, 'utf-8');
}

const files = fs.readdirSync(dir).map(f => path.join(dir, f));
files.push(path.join(compDir, 'BottomNav.jsx'), path.join(compDir, 'TopAppBar.jsx'));

files.forEach(processFile);
console.log('Fixed spacing in all files.');
