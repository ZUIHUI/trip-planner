const fs = require('fs');
const path = require('path');

const root = process.cwd();
const targets = ['src', 'api'];
const extensions = new Set(['.js', '.jsx']);
const allowedFiles = new Set([
  path.normalize('src/utils/logger.js')
]);
const forbidden = [
  { pattern: /\bconsole\.log\s*\(/, label: 'console.log' },
  { pattern: /\bconsole\.warn\s*\(/, label: 'console.warn' },
  { pattern: /\bconsole\.error\s*\(/, label: 'console.error' },
  { pattern: /\bconsole\.debug\s*\(/, label: 'console.debug' },
  { pattern: /\bconsole\.info\s*\(/, label: 'console.info' },
  { pattern: /\bwindow\.alert\s*\(/, label: 'window.alert' },
  { pattern: /\bwindow\.confirm\s*\(/, label: 'window.confirm' },
  { pattern: /\balert\s*\(/, label: 'alert' }
];

const collectFiles = (targetPath, files = []) => {
  if (!fs.existsSync(targetPath)) return files;
  const stat = fs.statSync(targetPath);
  if (stat.isDirectory()) {
    fs.readdirSync(targetPath).forEach((entry) => collectFiles(path.join(targetPath, entry), files));
    return files;
  }
  if (extensions.has(path.extname(targetPath))) files.push(targetPath);
  return files;
};

const failures = [];
targets.flatMap((target) => collectFiles(path.join(root, target))).forEach((file) => {
  if (allowedFiles.has(path.normalize(path.relative(root, file)))) return;
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((line, index) => {
    forbidden.forEach(({ pattern, label }) => {
      if (pattern.test(line)) {
        failures.push(`${path.relative(root, file)}:${index + 1} remove ${label}`);
      }
    });
  });
});

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('No production debug calls found.');
