#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function getAllPythonFiles(dir, baseDir = dir) {
  let files = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      files = files.concat(getAllPythonFiles(fullPath, baseDir));
    } else if (item.name.endsWith('.py')) {
      const relativePath = path.relative(baseDir, fullPath);
      files.push(relativePath.replace(/\\/g, '/'));
    }
  }
  
  return files;
}

const srcDir = path.join(__dirname, 'public', 'python', 'src');
const pythonFiles = getAllPythonFiles(srcDir);

console.log('// Auto-generated list of Python files');
console.log('const pythonModules = [');
pythonFiles.sort().forEach(file => {
  console.log(`  'src/${file}',`);
});
console.log('];');
console.log(`\n// Total: ${pythonFiles.length} files`);
