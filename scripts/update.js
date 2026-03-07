#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, rmSync, mkdirSync, copyFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import pkg from 'follow-redirects';
import { extract } from 'tar';

const { https } = pkg;

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');
const TEMP_DIR = join(ROOT_DIR, '.temp-indexer');
const INDEXER_DIR = join(ROOT_DIR, '.indexer');
const VERSION_FILE = join(INDEXER_DIR, 'VERSION');

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
      console.error('[code-indexer-mcp] ❌ Could not fetch latest release from GitHub');
      console.error('[code-indexer-mcp] Please check your internet connection and try again.\n');
      process.exit(1);
    }

    console.log('[code-indexer-mcp] Current version:', currentVersion || 'unknown');
    console.log('[code-indexer-mcp] Latest release:', latestTag);
    
    if (!force && currentVersion && currentVersion === latestTag) {
      console.log('[code-indexer-mcp] ✅ Already up to date!\n');
      return;
    }

    console.log('\n[code-indexer-mcp] Updating...\n');

    if (existsSync(TEMP_DIR)) {
      rmSync(TEMP_DIR, { recursive: true, force: true });
    }
    mkdirSync(TEMP_DIR, { recursive: true });

    const tarballUrl = `https://github.com/${REPO_OWNER}/${REPO_NAME}/archive/refs/tags/${latestTag}.tar.gz`;
    const tarballPath = join(TEMP_DIR, 'indexer.tar.gz');
    
    console.log(`[code-indexer-mcp] Downloading ${latestTag}...`);
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

    writeFileSync(VERSION_FILE, latestTag);

    console.log('[code-indexer-mcp] Installing indexer dependencies...');
    execSync('npm install --production', { cwd: INDEXER_DIR, stdio: 'inherit' });
    console.log('[code-indexer-mcp] Indexer dependencies installed.\n');

    rmSync(TEMP_DIR, { recursive: true, force: true });

    console.log('[code-indexer-mcp] ✅ Update complete!\n');
    console.log(`[code-indexer-mcp] Updated to version: ${latestTag}\n`);

  } catch (error) {
    console.error('[code-indexer-mcp] ❌ Update failed:', error.message);
    console.error('[code-indexer-mcp] Try running: npm run update\n');
    
    if (existsSync(TEMP_DIR)) {
      rmSync(TEMP_DIR, { recursive: true, force: true });
    }
    
    process.exit(1);
  }
}

export async function checkForUpdates(timeout = 5000) {
  const currentVersion = getCurrentVersion();
  
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Update check timeout')), timeout)
  );

  try {
    const latestTag = await Promise.race([fetchLatestTag(), timeoutPromise]);
    
    if (!latestTag) {
      return {
        hasUpdate: false,
        currentVersion: currentVersion || 'unknown',
        latestVersion: null,
        error: 'Could not fetch latest version'
      };
    }

    const hasUpdate = !currentVersion || currentVersion !== latestTag;
    
    return {
      hasUpdate,
      currentVersion: currentVersion || 'unknown',
      latestVersion: latestTag
    };
  } catch (error) {
    return {
      hasUpdate: false,
      currentVersion: currentVersion || 'unknown',
      latestVersion: null,
      error: error.message
    };
  }
}

export async function installUpdate() {
  try {
    if (!existsSync(INDEXER_DIR)) {
      return {
        success: false,
        error: 'Indexer not installed. Run npm install first.'
      };
    }

    const currentVersion = getCurrentVersion();
    const latestTag = await fetchLatestTag();
    
    if (!latestTag) {
      return {
        success: false,
        error: 'Could not fetch latest version'
      };
    }

    if (currentVersion === latestTag) {
      return {
        success: true,
        alreadyUpToDate: true,
        installedVersion: currentVersion,
        message: 'Already up to date'
      };
    }

    if (existsSync(TEMP_DIR)) {
      rmSync(TEMP_DIR, { recursive: true, force: true });
    }
    mkdirSync(TEMP_DIR, { recursive: true });

    const tarballUrl = `https://github.com/${REPO_OWNER}/${REPO_NAME}/archive/refs/tags/${latestTag}.tar.gz`;
    const tarballPath = join(TEMP_DIR, 'indexer.tar.gz');
    
    await downloadFile(tarballUrl, tarballPath);

    await extract({
      file: tarballPath,
      cwd: TEMP_DIR,
    });

    const extractedDir = join(TEMP_DIR, `${REPO_NAME}-${latestTag.replace(/^v/, '')}`);
    
    execSync('npm install', { cwd: extractedDir, stdio: 'pipe' });
    execSync('npm run build', { cwd: extractedDir, stdio: 'pipe' });

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

    writeFileSync(VERSION_FILE, latestTag);

    execSync('npm install --production', { cwd: INDEXER_DIR, stdio: 'pipe' });

    rmSync(TEMP_DIR, { recursive: true, force: true });

    return {
      success: true,
      installedVersion: latestTag,
      message: `Successfully updated to ${latestTag}`
    };
  } catch (error) {
    if (existsSync(TEMP_DIR)) {
      rmSync(TEMP_DIR, { recursive: true, force: true });
    }
    
    return {
      success: false,
      error: error.message
    };
  }
}

export function getVersionInfo() {
  const currentVersion = getCurrentVersion();
  const packageJsonPath = join(ROOT_DIR, 'package.json');
  const packageVersion = existsSync(packageJsonPath) 
    ? JSON.parse(readFileSync(packageJsonPath, 'utf-8')).version 
    : 'unknown';

  return {
    packageVersion,
    indexerVersion: currentVersion || 'not installed',
    indexerInstalled: existsSync(INDEXER_DIR)
  };
}

const args = process.argv.slice(2);
const forceUpdate = args.includes('--force') || args.includes('-f');

if (import.meta.url === `file://${process.argv[1]}`) {
  update(forceUpdate);
}
