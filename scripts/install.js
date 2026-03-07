#!/usr/bin/env node

/**
 * =============================================================================
 * INSTALL SCRIPT - Download and set up the code indexer on first run
 * =============================================================================
 * 
 * This script runs automatically when you run: npm install
 * 
 * WHAT DOES THIS SCRIPT DO?
 * -------------------------
 * 1. Fetches the latest release tag from GitHub
 * 2. Downloads the code from that release
 * 3. Extracts the tarball to a temporary directory
 * 4. Installs dependencies (npm install)
 * 5. Builds TypeScript (npm run build)
 * 6. Copies the built files to .indexer directory
 * 7. Writes VERSION file for update tracking
 * 
 * WHY DO WE NEED THIS?
 * -------------------
 * - The main branch (this package) is just a lightweight installer
 * - The actual code indexer is in the release branch
 * - This script downloads and sets it up automatically
 * - Users get the latest stable release without manual work
 * 
 * ARCHITECTURE:
 * ------------
 * npm install code-indexer-mcp
 *      ↓
 * [This script runs]
 *      ↓
 * Downloads from GitHub release
 *      ↓
 * .indexer/ directory created with:
 *   - dist/ (compiled TypeScript)
 *   - package.json (dependencies)
 *   - VERSION (tracking file)
 *      ↓
 * Ready to use!
 * 
 * =============================================================================
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync, copyFileSync, readdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createWriteStream } from 'fs';
import pkg from 'follow-redirects';
import { extract } from 'tar';

const { https } = pkg;

// ============================================================================
// CONSTANTS - Configuration for the installation
// ============================================================================

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');
const TEMP_DIR = join(ROOT_DIR, '.temp-indexer');
const INDEXER_DIR = join(ROOT_DIR, '.indexer');
const REPO_OWNER = 'kokoyroy';
const REPO_NAME = 'RAGcodeindexing';

// ============================================================================
// FETCH LATEST TAG - Get the latest release version from GitHub
// ============================================================================

/**
 * Queries the GitHub API to get the most recent release tag.
 * 
 * @returns {Promise<string|null>} - The tag name (e.g., "v1.0.0") or null
 * 
 * HOW IT WORKS:
 * 1. Makes HTTPS GET request to GitHub API
 * 2. API returns JSON array of all tags
 * 3. First tag in array is the latest
 * 4. Returns the tag name
 */
async function fetchLatestTag() {
  return new Promise((resolve, reject) => {
    https.get(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/tags`,
      { headers: { 'User-Agent': 'code-indexer-mcp' } },
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

// ============================================================================
// DOWNLOAD FILE - Download a file from URL to local path
// ============================================================================

/**
 * Downloads a file using HTTPS and saves it to disk.
 * 
 * @param {string} url - The URL to download from
 * @param {string} dest - The local file path to save to
 * @returns {Promise<void>} - Resolves when download complete
 * 
 * WHY STREAMS?
 * - Memory efficient (doesn't load entire file in RAM)
 * - Fast (data flows directly from network to disk)
 */
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

// ============================================================================
// COPY DIRECTORY - Recursively copy a directory
// ============================================================================

/**
 * Recursively copies all files and subdirectories.
 * 
 * @param {string} src - Source directory path
 * @param {string} dest - Destination directory path
 * 
 * HOW IT WORKS:
 * 1. Creates destination directory
 * 2. Reads all entries in source
 * 3. For each entry:
 *    - If directory: recurse
 *    - If file: copy it
 */
function copyDir(src, dest) {
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
}

// ============================================================================
// MAIN INSTALL FUNCTION
// ============================================================================

/**
 * Main installation function that orchestrates the entire setup process.
 * 
 * STEP-BY-STEP PROCESS:
 * 
 * 1. CHECK IF ALREADY INSTALLED
 *    - Look for .indexer directory
 *    - If exists, skip installation
 * 
 * 2. FETCH LATEST RELEASE
 *    - Query GitHub API for latest tag
 *    - Fail if no internet or no releases
 * 
 * 3. DOWNLOAD SOURCE CODE
 *    - Download tarball from GitHub
 *    - Save to temporary directory
 * 
 * 4. EXTRACT FILES
 *    - Extract tarball to temp directory
 *    - Get extracted directory path
 * 
 * 5. INSTALL DEPENDENCIES
 *    - Run npm install in extracted directory
 *    - This downloads all required packages
 * 
 * 6. BUILD TYPESCRIPT
 *    - Run npm run build
 *    - Compiles .ts files to .js
 * 
 * 7. COPY BUILT FILES
 *    - Copy dist/ directory to .indexer/
 *    - Copy package.json for dependencies
 * 
 * 8. INSTALL PRODUCTION DEPENDENCIES
 *    - Run npm install --production in .indexer/
 *    - Only installs runtime dependencies (no devDependencies)
 * 
 * 9. CLEAN UP
 *    - Remove temporary directory
 *    - Write VERSION file
 */
async function install() {
  console.log('[code-indexer-mcp] Installing code indexer...\n');

  try {
    // ==================== STEP 1: CHECK ALREADY INSTALLED ====================
    if (existsSync(INDEXER_DIR)) {
      console.log('[code-indexer-mcp] Indexer already installed. Skipping download.');
      console.log('[code-indexer-mcp] To reinstall, delete the .indexer directory and run npm install again.\n');
      return;
    }

    // ==================== STEP 2: FETCH LATEST RELEASE ====================
    console.log('[code-indexer-mcp] Fetching latest release...');
    const latestTag = await fetchLatestTag();
    
    if (!latestTag) {
      console.error('[code-indexer-mcp] ❌ Could not fetch latest release from GitHub');
      console.error('[code-indexer-mcp] Please check your internet connection and try again.\n');
      process.exit(1);
    }
    
    console.log(`[code-indexer-mcp] Latest release: ${latestTag}\n`);
    
    // ==================== STEP 3: PREPARE TEMP DIRECTORY ====================
    if (existsSync(TEMP_DIR)) {
      rmSync(TEMP_DIR, { recursive: true, force: true });
    }
    mkdirSync(TEMP_DIR, { recursive: true });

    // ==================== STEP 4: DOWNLOAD SOURCE CODE ====================
    const tarballUrl = `https://github.com/${REPO_OWNER}/${REPO_NAME}/archive/refs/tags/${latestTag}.tar.gz`;
    const tarballPath = join(TEMP_DIR, 'indexer.tar.gz');
    
    console.log('[code-indexer-mcp] Downloading from GitHub...');
    await downloadFile(tarballUrl, tarballPath);
    console.log('[code-indexer-mcp] Download complete.\n');

    // ==================== STEP 5: EXTRACT FILES ====================
    console.log('[code-indexer-mcp] Extracting...');
    await extract({
      file: tarballPath,
      cwd: TEMP_DIR,
    });
    console.log('[code-indexer-mcp] Extraction complete.\n');

    // Determine extracted directory name (removes 'v' prefix from tag)
    const extractedDir = join(TEMP_DIR, `${REPO_NAME}-${latestTag.replace(/^v/, '')}`);
    
    // ==================== STEP 6: INSTALL DEPENDENCIES ====================
    console.log('[code-indexer-mcp] Installing dependencies...');
    execSync('npm install --ignore-scripts --legacy-peer-deps', { cwd: extractedDir, stdio: 'inherit' });
    console.log('[code-indexer-mcp] Dependencies installed.\n');

    // ==================== STEP 7: BUILD TYPESCRIPT ====================
    console.log('[code-indexer-mcp] Building TypeScript...');
    execSync('npm run build', { cwd: extractedDir, stdio: 'inherit' });
    console.log('[code-indexer-mcp] Build complete.\n');

    // ==================== STEP 8: COPY BUILT FILES ====================
    console.log('[code-indexer-mcp] Copying built files...');
    mkdirSync(INDEXER_DIR, { recursive: true });
    
    // Copy dist directory (compiled code)
    copyDir(join(extractedDir, 'dist'), join(INDEXER_DIR, 'dist'));
    
    // Extract only dependencies (not devDependencies or scripts)
    const sourcePackageJson = JSON.parse(readFileSync(join(extractedDir, 'package.json'), 'utf-8'));
    const packageJson = {
      dependencies: sourcePackageJson.dependencies,
      optionalDependencies: sourcePackageJson.optionalDependencies,
    };
    writeFileSync(join(INDEXER_DIR, 'package.json'), JSON.stringify(packageJson, null, 2));

    // Write VERSION file for update tracking
    const VERSION_FILE = join(INDEXER_DIR, 'VERSION');
    writeFileSync(VERSION_FILE, latestTag);

    console.log('[code-indexer-mcp] Files copied.\n');

    // ==================== STEP 9: INSTALL PRODUCTION DEPENDENCIES ====================
    console.log('[code-indexer-mcp] Installing indexer dependencies...');
    execSync('npm install --production --legacy-peer-deps', { cwd: INDEXER_DIR, stdio: 'inherit' });
    console.log('[code-indexer-mcp] Indexer dependencies installed.\n');

    // ==================== STEP 10: CLEAN UP ====================
    rmSync(TEMP_DIR, { recursive: true, force: true });

    // ==================== SUCCESS! ====================
    console.log('[code-indexer-mcp] ✅ Installation complete!\n');
    console.log(`[code-indexer-mcp] Installed version: ${latestTag}`);
    console.log('[code-indexer-mcp] The MCP server is now ready to use.');
    console.log('[code-indexer-mcp] Run with: npx code-indexer-mcp\n');

  } catch (error) {
    console.error('[code-indexer-mcp] ❌ Installation failed:', error.message);
    console.error('[code-indexer-mcp] Please check your internet connection and try again.');
    
    // Clean up on failure
    if (existsSync(TEMP_DIR)) {
      rmSync(TEMP_DIR, { recursive: true, force: true });
    }
    
    process.exit(1);
  }
}

// Run the installation
install();
