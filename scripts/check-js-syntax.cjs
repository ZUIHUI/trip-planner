const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');

const root = process.cwd();
const includeDirs = ['src', 'api', 'functions', 'scripts'];
const includeFiles = ['vite.config.js', 'tailwind.config.js', 'postcss.config.js'];
const extensions = new Set(['.js', '.jsx', '.cjs']);
const ignoredDirs = new Set(['node_modules', 'dist', '.git']);
const importCandidates = ['', '.js', '.jsx', '.json', '.css'];
const importIndexCandidates = ['index.js', 'index.jsx'];

const collectFiles = (targetPath, files = []) => {
  if (!fs.existsSync(targetPath)) return files;
  const stat = fs.statSync(targetPath);
  if (stat.isDirectory()) {
    if (ignoredDirs.has(path.basename(targetPath))) return files;
    fs.readdirSync(targetPath).forEach((entry) => collectFiles(path.join(targetPath, entry), files));
    return files;
  }

  if (extensions.has(path.extname(targetPath))) {
    files.push(targetPath);
  }
  return files;
};

const files = [
  ...includeDirs.flatMap((dir) => collectFiles(path.join(root, dir))),
  ...includeFiles.map((file) => path.join(root, file)).filter((file) => fs.existsSync(file))
];

const failures = [];
const resolveRelativeImport = (file, request) => {
  if (!request.startsWith('.')) return true;
  const basePath = path.resolve(path.dirname(file), request);
  return importCandidates.some((candidate) => fs.existsSync(`${basePath}${candidate}`))
    || importIndexCandidates.some((candidate) => fs.existsSync(path.join(basePath, candidate)));
};

files.forEach((file) => {
  const source = fs.readFileSync(file, 'utf8');
  try {
    const ast = parser.parse(source, {
      sourceType: 'unambiguous',
      plugins: ['jsx', 'importMeta']
    });
    ast.program.body.forEach((node) => {
      const request = node.source?.value;
      if (typeof request === 'string' && !resolveRelativeImport(file, request)) {
        failures.push(`${path.relative(root, file)} unresolved import ${request}`);
      }
    });
  } catch (error) {
    failures.push(`${path.relative(root, file)}:${error.loc?.line || 0}:${error.loc?.column || 0} ${error.message}`);
  }
});

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`Checked ${files.length} JavaScript files.`);
