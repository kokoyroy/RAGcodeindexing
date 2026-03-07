#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, rmSync, mkdirSync, copyFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import pkg from 'follow-redirects';
const { https } = pkg;
import { extract } from 'tar';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');
const TEMP_DIR = join(ROOT_DIR, '.temp-indexer');
const INDEXER_DIR = join(ROOT_DIR, '.indexer');
const VERSION_FILE = join(INDEXER_DIR, 'VERSION');

const REPO_OWNER = 'kokoyroy';
const REPO_NAME = 'RAGcodeindexing';
const BRANCH = 'develop';

async function fetchLatestTag() {
  return new Promise((resolve, reject) => {
    https.get(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/tags`,
      {
        headers: { 'User-Agent': 'code-indexer-mcp' }
      },
      (response) => {
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => {
          try {
            const tags = JSON.parse(data);
            if (tags && tags.length > 0) {
              resolve(tags[0].name);
            } else {
              resolve(null);
            }
          } catch (error) {
            reject(error);
          }
        });
      }
    ).on('error', reject);
  });
}

function getCurrentVersion() {
  if (!existsSync(VERSION_FILE)) {
    return null;
  }
  return readFileSync(VERSION_FILE, 'utf-8').trim();
}

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      rmSync(dest, { force: true });
      reject(err);
    });
  });
}

async function update(force = false) {
  console.log('[code-indexer-mcp] Checking for updates...\n');

  try {
    if (!existsSync(INDEXER_DIR)) {
      console.log('[code-indexer-mcp] Indexer not installed. Running install...');
      const { install } = await import('./install.js');
      await install();
      return;
    }

    const currentVersion = getCurrentVersion();
    const latestTag = await fetchLatestTag();

    if (!latestTag) {
      console.log('[code-indexer-mcp] Could not fetch latest version. Using develop branch.\n');
    }

    console.log('[code-indexer-mcp] Current version:', currentVersion || 'unknown');
    console.log('[code-indexer-mcp] Latest release:', latestTag || 'develop branch');
    
    if (!force && currentVersion && latestTag && currentVersion === latestTag) {
      console.log('[code-indexer-mcp] ✅ Already up to date!\n');
      return;
    }

    console.log('\n[code-indexer-mcp] Updating...\n');

    if (existsSync(TEMP_DIR)) {
      rmSync(TEMP_DIR, { recursive: true, force: true });
    }
    mkdirSync(TEMP_DIR, { recursive: true });

    const sourceRef = latestTag || BRANCH;
    const tarballUrl = `https://github.com/${REPO_OWNER}/${REPO_NAME}/archive/refs/${latestTag ? 'tags' : 'heads'}/${sourceRef}.tar.gz`;
    const tarballPath = join(TEMP_DIR, 'indexer.tar.gz');
    
    console.log(`[code-indexer-mcp] Downloading ${sourceRef}...`);
    await downloadFile(tarballUrl, tarballPath);
    console.log('[code-indexer-mcp] Download complete.\n');

    console.log('[code-indexer-mcp] Extracting...');
    await extract({
      file: tarballPath,
      cwd: TEMP_DIR,
    });
    console.log('[code-indexer-mcp] Extraction complete.\n');

    const extractedDir = join(TEMP_DIR, `${REPO_NAME}-${sourceRef.replace(/^v/, '')}`);
    
    console.log('[code-indexer-mcp] Installing dependencies...');
    execSync('npm install', { cwd: extractedDir, stdio: 'inherit' });
    console.log('[code-indexer-mcp] Dependencies installed.\n');

    console.log('[code-indexer-mcp] Building TypeScript...');
    execSync('npm run build', { cwd: extractedDir, stdio: 'inherit' });
    console.log('[code-indexer-mcp] Build complete.\n');

    console.log('[code-indexer-mcp] Updating installation...');
    
    if (existsSync(INDEXER_DIR)) {
      rmSync(INDEXER_DIR, { recursive: true, force: true });
    }
    mkdirSync(INDEXER_DIR, { recursive: true });
    
    const copyDir = (src, dest) => {
      mkdirSync(dest, { recursive: true });
      const entries = readdirSync(src, { withFileTypes: true });
      for (const entry of entries) {
        const srcPath = join(src, entry.name);
        const destPath = join(dest, entry.name);
        if (entry.isDirectory()) {
          copyDir(srcPath, destPath);
        } else {
          copyFileSync(srcPath, destPath);
        }
      }
    };

    copyDir(join(extractedDir, 'dist'), join(INDEXER_DIR, 'dist'));
    
    const packageJson = JSON.parse(readFileSync(join(extractedDir, 'package.json'), 'utf-8'));
    const minimalPackageJson = {
      dependencies: packageJson.dependencies,
      optionalDependencies: packageJson.optionalDependencies,
    };
    writeFileSync(join(INDEXER_DIR, 'package.json'), JSON.stringify(minimalPackageJson, null, 2));

    const newVersion = latestTag || `${BRANCH}-${new Date().toISOString().split('T')[0]}`;
    writeFileSync(VERSION_FILE, newVersion);

    console.log('[code-indexer-mcp] Installing indexer dependencies...');
    execSync('npm install --production', { cwd: INDEXER_DIR, stdio: 'inherit' });
    console.log('[code-indexer-mcp] Indexer dependencies installed.\n');

    rmSync(TEMP_DIR, { recursive: true, force: true });

    console.log('[code-indexer-mcp] ✅ Update complete!\n');
    console.log(`[code-indexer-mcp] Updated to version: ${newVersion}\n`);

  } catch (error) {
    console.error('[code-indexer-mcp] ❌ Update failed:', error.message);
    console.error('[code-indexer-mcp] Try running: npm run update\n');
    
    if (existsSync(TEMP_DIR)) {
      rmSync(TEMP_DIR, { recursive: true, force: true });
    }
    
    process.exit(1);
  }
}

const args = process.argv.slice(2);
const forceUpdate = args.includes('--force') || args.includes('-f');

update(forceUpdate);
