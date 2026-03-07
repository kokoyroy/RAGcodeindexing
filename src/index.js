#!/usr/bin/env node

/**
 * =============================================================================
 * MAIN ENTRY POINT - CLI wrapper for the MCP server
 * =============================================================================
 * 
 * This is the main entry point for the code-indexer-mcp package.
 * It acts as a thin wrapper that loads and runs the actual MCP server.
 * 
 * WHAT DOES THIS SCRIPT DO?
 * -------------------------
 * 1. Validates command-line arguments
 * 2. Checks if indexer is installed
 * 3. Checks for updates (in background)
 * 4. Loads and starts the MCP server from .indexer/
 * 
 * WHY THIS ARCHITECTURE?
 * ---------------------
 * - Keeps this package lightweight (installer only)
 * - Actual indexer code is downloaded separately
 * - Allows updates without republishing this package
 * - Separates installer from runtime code
 * 
 * USAGE:
 * ------
 * As CLI:
 *   npx code-indexer-mcp /path/to/project
 *   node src/index.js /path/to/project
 * 
 * Get version:
 *   npx code-indexer-mcp --version
 * 
 * Check for updates:
 *   npx code-indexer-mcp --check-update
 * 
 * ARCHITECTURE:
 * ------------
 * User runs: npx code-indexer-mcp /my/project
 *      ↓
 * This script (src/index.js) runs
 *      ↓
 * Validates project path exists
 *      ↓
 * Checks .indexer/dist/mcpServer.js exists
 *      ↓
 * Loads MCP server from .indexer/
 *      ↓
 * Sets PROJECT_PATH environment variable
 *      ↓
 * Starts MCP server
 *      ↓
 * MCP server indexes project and handles requests
 * 
 * DIRECTORY STRUCTURE:
 * -------------------
 * code-indexer-mcp/
 * ├── package.json          (installer package)
 * ├── src/
 * │   └── index.js          (this file)
 * ├── scripts/
 * │   ├── install.js        (download indexer)
 * │   ├── update.js         (update indexer)
 * │   └── configure.js      (configure clients)
 * └── .indexer/             (downloaded by install.js)
 *     ├── dist/
 *     │   ├── mcpServer.js  (actual MCP server)
 *     │   └── ...           (other compiled files)
 *     ├── package.json      (dependencies)
 *     └── VERSION           (installed version)
 * 
 * =============================================================================
 */

import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import pkg from 'follow-redirects';

const { https } = pkg;

// ============================================================================
// CONSTANTS - Directory and file paths
// ============================================================================

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');
const INDEXER_DIR = join(ROOT_DIR, '.indexer');
const VERSION_FILE = join(INDEXER_DIR, 'VERSION');
const MCP_SERVER = join(INDEXER_DIR, 'dist', 'mcpServer.js');

const PACKAGE_VERSION = '1.0.0';

// ============================================================================
// GET CURRENT VERSION - Read installed version
// ============================================================================

/**
 * Reads the VERSION file to get currently installed indexer version.
 * 
 * @returns {string|null} - Installed version or null if not found
 */
function getCurrentVersion() {
  try {
    if (existsSync(VERSION_FILE)) {
      return readFileSync(VERSION_FILE, 'utf-8').trim();
    }
  } catch (error) {
    return null;
  }
}

// ============================================================================
// CHECK FOR UPDATES - Simple update check (deprecated)
// ============================================================================

/**
 * Checks GitHub for latest version and logs if update available.
 * 
 * @returns {Promise<string|null>} - Latest version tag or null
 * 
 * NOTE: This is a simple check used for --version flag.
 * For more detailed update info, use checkForUpdatesBackground() instead.
 */
async function checkForUpdates() {
  return new Promise((resolve, reject) => {
    https.get(
      `https://api.github.com/repos/kokoyroy/RAGcodeindexing/tags`,
      { headers: { 'User-Agent': 'code-indexer-mcp' } },
      (response) => {
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => {
          try {
            const tags = JSON.parse(data);
            if (tags && tags.length > 0) {
              const latestVersion = tags[0].name;
              const currentVersion = getCurrentVersion();
              
              // Show update notification if newer version available
              if (!currentVersion || currentVersion !== latestVersion) {
                console.log(`\n[code-indexer-mcp] 🔄 Update available!`);
                console.log(`[code-indexer-mcp] Current: ${currentVersion || 'unknown'}`);
                console.log(`[code-indexer-mcp] Latest: ${latestVersion}`);
                console.log(`[code-indexer-mcp] Run: npm run update\n`);
              }
              resolve(latestVersion);
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
// CHECK FOR UPDATES BACKGROUND - Non-blocking update check
// ============================================================================

/**
 * Checks for updates in the background without blocking server startup.
 * Uses the update.js module's checkForUpdates function.
 * 
 * WHAT IT DOES:
 * 1. Imports checkForUpdates from scripts/update.js
 * 2. Calls it with 5 second timeout
 * 3. If update available, logs to stderr (doesn't interfere with MCP)
 * 4. Silently fails on errors (doesn't affect server)
 * 
 * WHY BACKGROUND?
 * - Doesn't delay server startup
 * - Doesn't block if GitHub is slow/unreachable
 * - Uses stderr so MCP protocol isn't affected
 */
async function checkForUpdatesBackground() {
  try {
    const updateScript = join(ROOT_DIR, 'scripts', 'update.js');
    const { checkForUpdates } = await import(`file://${updateScript}`);
    
    // Check with 5 second timeout
    const result = await checkForUpdates(5000);
    
    // Log to stderr if update available (doesn't interfere with MCP on stdout)
    if (result.hasUpdate) {
      console.error(`[code-indexer-mcp] 🔄 Update available: ${result.latestVersion}`);
      console.error(`[code-indexer-mcp] Current: ${result.currentVersion}`);
      console.error(`[code-indexer-mcp] Ask Claude to install or run: npm run update\n`);
    }
  } catch (error) {
    // Silently fail - update checks are optional
  }
}

// ============================================================================
// MAIN FUNCTION - Entry point for CLI
// ============================================================================

/**
 * Main function that parses arguments and starts the MCP server.
 * 
 * STEP-BY-STEP PROCESS:
 * 
 * 1. PARSE ARGUMENTS
 *    - Extract project path
 *    - Check for --version or --check-update flags
 * 
 * 2. HANDLE --version FLAG
 *    - Print package version
 *    - Print indexer version if installed
 *    - Check for updates (if interactive)
 * 
 * 3. HANDLE --check-update FLAG
 *    - Check for updates and exit
 * 
 * 4. VALIDATE PROJECT PATH
 *    - Ensure path is provided
 *    - Ensure path exists on disk
 * 
 * 5. CHECK INSTALLATION
 *    - Ensure .indexer/dist/mcpServer.js exists
 *    - Show error if not installed
 * 
 * 6. START UPDATE CHECK
 *    - Run update check in background
 *    - Don't wait for it to complete
 * 
 * 7. LOAD AND START MCP SERVER
 *    - Dynamically import mcpServer.js
 *    - Set PROJECT_PATH environment variable
 *    - Call server function (handles MCP protocol)
 */
async function main() {
  const args = process.argv.slice(2);
  const projectPath = args.find(arg => !arg.startsWith('-'));

  // ==================== HANDLE --version FLAG ====================
  if (args.includes('--version') || args.includes('-v')) {
    const currentVersion = getCurrentVersion();
    
    // Show package version
    console.log(`code-indexer-mcp v${PACKAGE_VERSION}`);
    
    // Show indexer version if installed
    if (currentVersion) {
      console.log(`Indexer version: ${currentVersion}`);
    }
    
    // Check for updates if running in terminal
    if (process.stdout.isTTY) {
      try {
        const latestVersion = await checkForUpdates();
        if (latestVersion) {
          console.log(`\n💡 Tip: Update available (${latestVersion})`);
        }
      } catch (error) {
        // Silently fail - version check is optional
      }
    }
    process.exit(0);
  }

  // ==================== HANDLE --check-update FLAG ====================
  if (args.includes('--check-update')) {
    await checkForUpdates();
    process.exit(0);
  }

  // ==================== VALIDATE PROJECT PATH ====================
  // Try multiple sources for project path:
  // 1. Command line argument
  // 2. PROJECT_PATH environment variable
  // 3. Current working directory
  const finalProjectPath = projectPath || process.env.PROJECT_PATH || process.cwd();
  
  if (!existsSync(finalProjectPath)) {
    console.error(`[code-indexer-mcp] ❌ Project path does not exist: ${finalProjectPath}`);
    console.error('[code-indexer-mcp] Usage: code-indexer-mcp [project-path]');
    console.error('[code-indexer-mcp] Or set PROJECT_PATH environment variable');
    console.error('[code-indexer-mcp] Example: code-indexer-mcp /path/to/your/project');
    process.exit(1);
  }

  // ==================== CHECK INSTALLATION ====================
  if (!existsSync(MCP_SERVER)) {
    console.error('[code-indexer-mcp] Indexer not installed. Running setup...\n');
    
    try {
      const installScript = join(ROOT_DIR, 'scripts', 'install.js');
      const { install } = await import(`file://${installScript}`);
      await install();
      
      // Re-check after installation
      if (!existsSync(MCP_SERVER)) {
        console.error('[code-indexer-mcp] ❌ Installation completed but MCP server not found');
        process.exit(1);
      }
    } catch (error) {
      console.error('[code-indexer-mcp] ❌ Auto-installation failed:', error.message);
      console.error('[code-indexer-mcp] Please run manually: npm run setup\n');
      process.exit(1);
    }
  }

  // ==================== CHECK FOR UPDATES (BACKGROUND) ====================
  checkForUpdatesBackground();

  // ==================== START MCP SERVER ====================
  try {
    console.error('[code-indexer-mcp] Starting MCP server...');
    console.error(`[code-indexer-mcp] Project: ${finalProjectPath}`);
    
    // Dynamically import the MCP server
    const { McpServer } = await import(MCP_SERVER);
    
    // Handle different export styles
    if (typeof McpServer === 'function') {
      // Direct export: export function McpServer() { ... }
      process.env.PROJECT_PATH = finalProjectPath;
      await McpServer();
    } else if (McpServer && typeof McpServer.default === 'function') {
      // Default export: export default function() { ... }
      process.env.PROJECT_PATH = finalProjectPath;
      await McpServer.default();
    } else {
      console.error('[code-indexer-mcp] ❌ Invalid MCP server export');
      process.exit(1);
    }
  } catch (error) {
    console.error('[code-indexer-mcp] ❌ Failed to start MCP server:', error.message);
    console.error('[code-indexer-mcp] Try reinstalling: rm -rf .indexer && npm install\n');
    process.exit(1);
  }
}

// Run main function
main();
