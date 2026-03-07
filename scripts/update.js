#!/usr/bin/env node

/**
 * =============================================================================
 * UPDATE SCRIPT - Check for and install updates from GitHub releases
 * =============================================================================
 *
 * This script handles updating the code indexer to the latest version.
 *
 * WHAT DOES THIS SCRIPT DO?
 * -------------------------
 * 1. Checks if indexer is installed
 * 2. Fetches the latest release tag from GitHub
 * 3. Compares with current installed version
 * 4. If update available, downloads and installs new version
 * 5. Updates VERSION file for tracking
 *
 * WHY DO WE NEED THIS?
 * -------------------
 * - Keeps the indexer up-to-date with latest features and bug fixes
 * - Avoids full reinstall by only updating changed files
 * - Provides version tracking and update notifications
 *
 * USAGE:
 * ------
 * - Manual update: npm run update
 * - Force update: npm run update -- --force
 * - Check updates: imported by src/index.js for automatic checks
 *
 * ARCHITECTURE:
 * ------------
 * npm run update
 *      ↓
 * [This script runs]
 *      ↓
 * Checks VERSION file in .indexer/
 *      ↓
 * Fetches latest tag from GitHub API
 *      ↓
 * If update available:
 *   - Downloads new tarball
 *   - Builds and installs
 *   - Updates VERSION file
 *      ↓
 * Ready with new version!
 *
 * EXPORTED FUNCTIONS:
 * ------------------
 * - update(force): Main update function (CLI)
 * - checkForUpdates(timeout): Check if update available (returns info)
 * - installUpdate(): Install update programmatically (returns result)
 * - getVersionInfo(): Get current version info
 *
 * =============================================================================
 */

import { execSync } from "child_process";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  rmSync,
  mkdirSync,
  copyFileSync,
  readdirSync,
  statSync,
} from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import pkg from "follow-redirects";
import { extract } from "tar";

const { https } = pkg;

// ============================================================================
// CONSTANTS - Configuration for the update process
// ============================================================================

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, "..");
const TEMP_DIR = join(ROOT_DIR, ".temp-indexer");
const INDEXER_DIR = join(ROOT_DIR, ".indexer");
const VERSION_FILE = join(INDEXER_DIR, "VERSION");

const REPO_OWNER = "kokoyroy";
const REPO_NAME = "RAGcodeindexing";

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
    https
      .get(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/tags`,
        {
          headers: { "User-Agent": "code-indexer-mcp" },
        },
        (response) => {
          let data = "";
          response.on("data", (chunk) => (data += chunk));
          response.on("end", () => {
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
        },
      )
      .on("error", reject);
  });
}

// ============================================================================
// GET CURRENT VERSION - Read the installed version from VERSION file
// ============================================================================

/**
 * Reads the VERSION file to determine currently installed version.
 *
 * @returns {string|null} - The installed version or null if not installed
 */
function getCurrentVersion() {
  if (!existsSync(VERSION_FILE)) {
    return null;
  }
  return readFileSync(VERSION_FILE, "utf-8").trim();
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
 */
async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(dest);
    https
      .get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download: ${response.statusCode}`));
          return;
        }
        response.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve();
        });
      })
      .on("error", (err) => {
        rmSync(dest, { force: true });
        reject(err);
      });
  });
}

// ============================================================================
// MAIN UPDATE FUNCTION - CLI interface for updating
// ============================================================================

/**
 * Main update function that orchestrates the update process.
 *
 * @param {boolean} force - Force update even if already up to date
 *
 * STEP-BY-STEP PROCESS:
 *
 * 1. CHECK IF INSTALLED
 *    - Look for .indexer directory
 *    - If not found, run install instead
 *
 * 2. FETCH LATEST RELEASE
 *    - Query GitHub API for latest tag
 *    - Compare with current version
 *
 * 3. CHECK IF UPDATE NEEDED
 *    - Skip if already up to date (unless --force)
 *
 * 4. DOWNLOAD NEW VERSION
 *    - Download tarball from GitHub
 *    - Save to temporary directory
 *
 * 5. EXTRACT AND BUILD
 *    - Extract tarball
 *    - Install dependencies
 *    - Build TypeScript
 *
 * 6. UPDATE INSTALLATION
 *    - Remove old .indexer directory
 *    - Copy new dist/ files
 *    - Install production dependencies
 *
 * 7. CLEAN UP
 *    - Remove temporary directory
 *    - Update VERSION file
 */
async function update(force = false) {
  console.log("[code-indexer-mcp] Checking for updates...\n");

  try {
    // ==================== STEP 1: CHECK IF INSTALLED ====================
    if (!existsSync(INDEXER_DIR)) {
      console.log("[code-indexer-mcp] Indexer not installed. Running install...");
      const { install } = await import("./install.js");
      await install();
      return;
    }

    // ==================== STEP 2: FETCH LATEST RELEASE ====================
    const currentVersion = getCurrentVersion();
    const latestTag = await fetchLatestTag();

    if (!latestTag) {
      console.error(
        "[code-indexer-mcp] ❌ Could not fetch latest release from GitHub",
      );
      console.error(
        "[code-indexer-mcp] Please check your internet connection and try again.\n",
      );
      process.exit(1);
    }

    console.log("[code-indexer-mcp] Current version:", currentVersion || "unknown");
    console.log("[code-indexer-mcp] Latest release:", latestTag);

    // ==================== STEP 3: CHECK IF UPDATE NEEDED ====================
    if (!force && currentVersion && currentVersion === latestTag) {
      console.log("[code-indexer-mcp] ✅ Already up to date!\n");
      return;
    }

    console.log("\n[code-indexer-mcp] Updating...\n");

    // ==================== STEP 4: PREPARE TEMP DIRECTORY ====================
    if (existsSync(TEMP_DIR)) {
      rmSync(TEMP_DIR, { recursive: true, force: true });
    }
    mkdirSync(TEMP_DIR, { recursive: true });

    // ==================== STEP 5: DOWNLOAD NEW VERSION ====================
    const tarballUrl = `https://github.com/${REPO_OWNER}/${REPO_NAME}/archive/refs/tags/${latestTag}.tar.gz`;
    const tarballPath = join(TEMP_DIR, "indexer.tar.gz");

    console.log(`[code-indexer-mcp] Downloading ${latestTag}...`);
    await downloadFile(tarballUrl, tarballPath);
    console.log("[code-indexer-mcp] Download complete.\n");

    // ==================== STEP 6: EXTRACT FILES ====================
    console.log("[code-indexer-mcp] Extracting...");
    await extract({
      file: tarballPath,
      cwd: TEMP_DIR,
    });
    console.log("[code-indexer-mcp] Extraction complete.\n");

    const extractedDir = join(
      TEMP_DIR,
      `${REPO_NAME}-${latestTag.replace(/^v/, "")}`,
    );

    // ==================== STEP 7: BUILD NEW VERSION ====================
    console.log("[code-indexer-mcp] Installing dependencies...");
    execSync("npm install", { cwd: extractedDir, stdio: "inherit" });
    console.log("[code-indexer-mcp] Dependencies installed.\n");

    console.log("[code-indexer-mcp] Building TypeScript...");
    execSync("npm run build", { cwd: extractedDir, stdio: "inherit" });
    console.log("[code-indexer-mcp] Build complete.\n");

    // ==================== STEP 8: UPDATE INSTALLATION ====================
    console.log("[code-indexer-mcp] Updating installation...");

    // Remove old installation
    if (existsSync(INDEXER_DIR)) {
      rmSync(INDEXER_DIR, { recursive: true, force: true });
    }
    mkdirSync(INDEXER_DIR, { recursive: true });

    // Copy directory helper function
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

    // Copy built files
    copyDir(join(extractedDir, "dist"), join(INDEXER_DIR, "dist"));

    // Create minimal package.json with only dependencies
    const packageJson = JSON.parse(
      readFileSync(join(extractedDir, "package.json"), "utf-8"),
    );
    const minimalPackageJson = {
      dependencies: packageJson.dependencies,
      optionalDependencies: packageJson.optionalDependencies,
    };
    writeFileSync(
      join(INDEXER_DIR, "package.json"),
      JSON.stringify(minimalPackageJson, null, 2),
    );

    // Update VERSION file
    writeFileSync(VERSION_FILE, latestTag);

    // ==================== STEP 9: INSTALL PRODUCTION DEPENDENCIES ====================
    console.log("[code-indexer-mcp] Installing indexer dependencies...");
    execSync("npm install --production", { cwd: INDEXER_DIR, stdio: "inherit" });
    console.log("[code-indexer-mcp] Indexer dependencies installed.\n");

    // ==================== STEP 10: CLEAN UP ====================
    rmSync(TEMP_DIR, { recursive: true, force: true });

    // ==================== SUCCESS! ====================
    console.log("[code-indexer-mcp] ✅ Update complete!\n");
    console.log(`[code-indexer-mcp] Updated to version: ${latestTag}\n`);
  } catch (error) {
    console.error("[code-indexer-mcp] ❌ Update failed:", error.message);
    console.error("[code-indexer-mcp] Try running: npm run update\n");

    // Clean up on failure
    if (existsSync(TEMP_DIR)) {
      rmSync(TEMP_DIR, { recursive: true, force: true });
    }

    process.exit(1);
  }
}

// ============================================================================
// CHECK FOR UPDATES - Programmatic update check (returns info)
// ============================================================================

/**
 * Checks if an update is available without installing it.
 * Used by src/index.js to notify users of updates.
 *
 * @param {number} timeout - Timeout in milliseconds (default: 5000ms)
 * @returns {Promise<Object>} - Update information
 *
 * RETURN OBJECT:
 * {
 *   hasUpdate: boolean,        // True if update available
 *   currentVersion: string,    // Currently installed version
 *   latestVersion: string,     // Latest available version
 *   error: string              // Error message if check failed
 * }
 */
export async function checkForUpdates(timeout = 5000) {
  const currentVersion = getCurrentVersion();

  // Create timeout promise to prevent hanging
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Update check timeout")), timeout),
  );

  try {
    const latestTag = await Promise.race([fetchLatestTag(), timeoutPromise]);

    if (!latestTag) {
      return {
        hasUpdate: false,
        currentVersion: currentVersion || "unknown",
        latestVersion: null,
        error: "Could not fetch latest version",
      };
    }

    const hasUpdate = !currentVersion || currentVersion !== latestTag;

    return {
      hasUpdate,
      currentVersion: currentVersion || "unknown",
      latestVersion: latestTag,
    };
  } catch (error) {
    return {
      hasUpdate: false,
      currentVersion: currentVersion || "unknown",
      latestVersion: null,
      error: error.message,
    };
  }
}

// ============================================================================
// INSTALL UPDATE - Programmatic update installation (returns result)
// ============================================================================

/**
 * Installs the latest update programmatically.
 * Used by MCP tools to allow Claude to update the indexer.
 *
 * @returns {Promise<Object>} - Installation result
 *
 * RETURN OBJECT:
 * {
 *   success: boolean,          // True if update succeeded
 *   alreadyUpToDate: boolean,  // True if already on latest version
 *   installedVersion: string,  // Version that was installed
 *   message: string,           // Success message
 *   error: string              // Error message if failed
 * }
 */
export async function installUpdate() {
  try {
    // Check if indexer is installed
    if (!existsSync(INDEXER_DIR)) {
      return {
        success: false,
        error: "Indexer not installed. Run npm install first.",
      };
    }

    const currentVersion = getCurrentVersion();
    const latestTag = await fetchLatestTag();

    if (!latestTag) {
      return {
        success: false,
        error: "Could not fetch latest version",
      };
    }

    // Check if already up to date
    if (currentVersion === latestTag) {
      return {
        success: true,
        alreadyUpToDate: true,
        installedVersion: currentVersion,
        message: "Already up to date",
      };
    }

    // Prepare temp directory
    if (existsSync(TEMP_DIR)) {
      rmSync(TEMP_DIR, { recursive: true, force: true });
    }
    mkdirSync(TEMP_DIR, { recursive: true });

    // Download and extract
    const tarballUrl = `https://github.com/${REPO_OWNER}/${REPO_NAME}/archive/refs/tags/${latestTag}.tar.gz`;
    const tarballPath = join(TEMP_DIR, "indexer.tar.gz");

    await downloadFile(tarballUrl, tarballPath);

    await extract({
      file: tarballPath,
      cwd: TEMP_DIR,
    });

    const extractedDir = join(
      TEMP_DIR,
      `${REPO_NAME}-${latestTag.replace(/^v/, "")}`,
    );

    // Build (suppress output)
    execSync("npm install", { cwd: extractedDir, stdio: "pipe" });
    execSync("npm run build", { cwd: extractedDir, stdio: "pipe" });

    // Update installation
    if (existsSync(INDEXER_DIR)) {
      rmSync(INDEXER_DIR, { recursive: true, force: true });
    }
    mkdirSync(INDEXER_DIR, { recursive: true });

    // Copy directory helper
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

    copyDir(join(extractedDir, "dist"), join(INDEXER_DIR, "dist"));

    const packageJson = JSON.parse(
      readFileSync(join(extractedDir, "package.json"), "utf-8"),
    );
    const minimalPackageJson = {
      dependencies: packageJson.dependencies,
      optionalDependencies: packageJson.optionalDependencies,
    };
    writeFileSync(
      join(INDEXER_DIR, "package.json"),
      JSON.stringify(minimalPackageJson, null, 2),
    );

    writeFileSync(VERSION_FILE, latestTag);

    // Install dependencies (suppress output)
    execSync("npm install --production", { cwd: INDEXER_DIR, stdio: "pipe" });

    // Clean up
    rmSync(TEMP_DIR, { recursive: true, force: true });

    return {
      success: true,
      installedVersion: latestTag,
      message: `Successfully updated to ${latestTag}`,
    };
  } catch (error) {
    // Clean up on failure
    if (existsSync(TEMP_DIR)) {
      rmSync(TEMP_DIR, { recursive: true, force: true });
    }

    return {
      success: false,
      error: error.message,
    };
  }
}

// ============================================================================
// GET VERSION INFO - Get current version information
// ============================================================================

/**
 * Returns information about installed versions.
 *
 * @returns {Object} - Version information
 *
 * RETURN OBJECT:
 * {
 *   packageVersion: string,      // Version of this installer package
 *   indexerVersion: string,      // Version of installed indexer
 *   indexerInstalled: boolean    // True if indexer is installed
 * }
 */
export function getVersionInfo() {
  const currentVersion = getCurrentVersion();
  const packageJsonPath = join(ROOT_DIR, "package.json");
  const packageVersion = existsSync(packageJsonPath)
    ? JSON.parse(readFileSync(packageJsonPath, "utf-8")).version
    : "unknown";

  return {
    packageVersion,
    indexerVersion: currentVersion || "not installed",
    indexerInstalled: existsSync(INDEXER_DIR),
  };
}

// ============================================================================
// CLI ENTRY POINT - Run when executed directly
// ============================================================================

// Parse command line arguments
const args = process.argv.slice(2);
const forceUpdate = args.includes("--force") || args.includes("-f");

// Run update if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  update(forceUpdate);
}
