#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync, copyFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createWriteStream, createReadStream } from 'fs';
import { pipeline } from 'stream/promises';
import pkg from 'follow-redirects';
import { extract } from 'tar';

const { https } = pkg;

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');
const TEMP_DIR = join(ROOT_DIR, '.temp-indexer');
const INDEXER_DIR = join(ROOT_DIR, '.indexer');

const REPO_OWNER = 'kokoyroy';
const REPO_NAME = 'RAGcodeindexing';

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

async function install() {
  console.log('[code-indexer-mcp] Installing code indexer...\n');

  try {
    if (existsSync(INDEXER_DIR)) {
      console.log('[code-indexer-mcp] Indexer already installed. Skipping download.');
      console.log('[code-indexer-mcp] To reinstall, delete the .indexer directory and run npm install again.\n');
      return;
    }

    console.log('[code-indexer-mcp] Fetching latest release...');
    const latestTag = await fetchLatestTag();
    
    if (!latestTag) {
      console.error('[code-indexer-mcp] ❌ Could not fetch latest release from GitHub');
      console.error('[code-indexer-mcp] Please check your internet connection and try again.\n');
      process.exit(1);
    }
    
    console.log(`[code-indexer-mcp] Latest release: ${latestTag}\n`);
    
    if (existsSync(TEMP_DIR)) {
      rmSync(TEMP_DIR, { recursive: true, force: true });
    }
    mkdirSync(TEMP_DIR, { recursive: true });

    const tarballUrl = `https://github.com/${REPO_OWNER}/${REPO_NAME}/archive/refs/tags/${latestTag}.tar.gz`;
    const tarballPath = join(TEMP_DIR, 'indexer.tar.gz');
    
    console.log('[code-indexer-mcp] Downloading from GitHub...');
    await downloadFile(tarballUrl, tarballPath);
    console.log('[code-indexer-mcp] Download complete.\n');

    console.log('[code-indexer-mcp] Extracting...');
    await extract({
      file: tarballPath,
      cwd: TEMP_DIR,
    });
    console.log('[code-indexer-mcp] Extraction complete.\n');

    const extractedDir = join(TEMP_DIR, `${REPO_NAME}-${latestTag.replace(/^v/, '')}`);
    
    console.log('[code-indexer-mcp] Installing dependencies...');
    execSync('npm install', { cwd: extractedDir, stdio: 'inherit' });
    console.log('[code-indexer-mcp] Dependencies installed.\n');

    console.log('[code-indexer-mcp] Building TypeScript...');
    execSync('npm run build', { cwd: extractedDir, stdio: 'inherit' });
    console.log('[code-indexer-mcp] Build complete.\n');

    console.log('[code-indexer-mcp] Copying built files...');
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
    
    const packageJson = {
      dependencies: require(join(extractedDir, 'package.json')).dependencies,
      optionalDependencies: require(join(extractedDir, 'package.json')).optionalDependencies,
    };
    writeFileSync(join(INDEXER_DIR, 'package.json'), JSON.stringify(packageJson, null, 2));

    const VERSION_FILE = join(INDEXER_DIR, 'VERSION');
    writeFileSync(VERSION_FILE, latestTag);

    console.log('[code-indexer-mcp] Files copied.\n');

    console.log('[code-indexer-mcp] Installing indexer dependencies...');
    execSync('npm install --production', { cwd: INDEXER_DIR, stdio: 'inherit' });
    console.log('[code-indexer-mcp] Indexer dependencies installed.\n');

    rmSync(TEMP_DIR, { recursive: true, force: true });

    console.log('[code-indexer-mcp] ✅ Installation complete!\n');
    console.log(`[code-indexer-mcp] Installed version: ${latestTag}`);
    console.log('[code-indexer-mcp] The MCP server is now ready to use.');
    console.log('[code-indexer-mcp] Run with: npx code-indexer-mcp\n');

  } catch (error) {
    console.error('[code-indexer-mcp] ❌ Installation failed:', error.message);
    console.error('[code-indexer-mcp] Please check your internet connection and try again.');
    
    if (existsSync(TEMP_DIR)) {
      rmSync(TEMP_DIR, { recursive: true, force: true });
    }
    
    process.exit(1);
  }
}

install();
