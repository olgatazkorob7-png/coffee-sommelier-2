import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const nextDir = path.join(projectRoot, '.next');
const targetDirs = [
  path.join(projectRoot, 'dist'),
  path.join(projectRoot, 'out'),
  path.join(projectRoot, 'build'),
];

console.log('[postbuild] Ensuring build artifacts in target directories (dist, out, build)...');

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    const entries = fs.readdirSync(src);
    for (const entry of entries) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

for (const targetDir of targetDirs) {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  if (fs.existsSync(nextDir)) {
    // 1. Copy entire .next into target directory
    copyRecursive(nextDir, targetDir);

    // 2. Ensure index.html exists in root of target directory
    const htmlCandidates = [
      path.join(nextDir, 'server', 'app', 'index.html'),
      path.join(nextDir, 'server', 'pages', 'index.html'),
      path.join(nextDir, 'server', 'app', 'page.html'),
    ];

    for (const candidate of htmlCandidates) {
      if (fs.existsSync(candidate)) {
        fs.copyFileSync(candidate, path.join(targetDir, 'index.html'));
        break;
      }
    }

    // 3. Ensure static chunks are available at both /static and /_next/static
    const nextStaticDir = path.join(nextDir, 'static');
    if (fs.existsSync(nextStaticDir)) {
      copyRecursive(nextStaticDir, path.join(targetDir, '_next', 'static'));
      copyRecursive(nextStaticDir, path.join(targetDir, 'static'));
    }
  }

  const publicDir = path.join(projectRoot, 'public');
  if (fs.existsSync(publicDir)) {
    copyRecursive(publicDir, targetDir);
  }
}

const countFiles = (dir) => {
  let count = 0;
  if (!fs.existsSync(dir)) return 0;
  const list = fs.readdirSync(dir);
  for (const item of list) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      count += countFiles(fullPath);
    } else {
      count++;
    }
  }
  return count;
};

for (const targetDir of targetDirs) {
  const total = countFiles(targetDir);
  console.log(`[postbuild] Artifacts prepared in ${path.basename(targetDir)}: ${total} files.`);
}
