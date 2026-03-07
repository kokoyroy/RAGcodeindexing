#!/usr/bin/env node

import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import { https } from 'follow-redirects';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');
const INDEXER_DIR = join(ROOT_DIR, '.indexer');
const VERSION_FILE = join(INDEXER_DIR, 'VERSION');
const MCP_SERVER = join(INDEXER_DIR, 'dist', 'mcpServer.js');

const PACKAGE_VERSION = '1.0.0';

function getCurrentVersion() {
  try {
    if (existsSync(VERSION_FILE)) {
      return readFileSync(VERSION_FILE, 'utf-8').trim();
    }
  } catch (error) {
    return null;
  }
}

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

async function checkForUpdatesBackground() {
  try {
    const updateScript = join(ROOT_DIR, 'scripts', 'update.js');
    const { checkForUpdates } = await import(`file://${updateScript}`);
    
    const result = await checkForUpdates(5000);
    
    if (result.hasUpdate) {
      console.error(`[code-indexer-mcp] 🔄 Update available: ${result.latestVersion}`);
      console.error(`[code-indexer-mcp] Current: ${result.currentVersion}`);
      console.error(`[code-indexer-mcp] Ask Claude to install or run: npm run update\n`);
    }
  } catch (error) {
  }
}

async function main() {
  const args = process.argv.slice(2);
  const projectPath = args.find(arg => !arg.startsWith('-'));

  if (args.includes('--version') || args.includes('-v')) {
    const currentVersion = getCurrentVersion();
    
    console.log(`code-indexer-mcp v${PACKAGE_VERSION}`);
    if (currentVersion) {
      console.log(`Indexer version: ${currentVersion}`);
    }
    
    if (process.stdout.isTTY) {
      try {
        const latestVersion = await checkForUpdates();
        if (latestVersion) {
          console.log(`\n💡 Tip: Update available (${latestVersion})`);
        }
      } catch (error) {
      }
    }
    process.exit(0);
  }

  if (args.includes('--check-update')) {
    await checkForUpdates();
    process.exit(0);
  }

  if (!projectPath) {
    console.error('[code-indexer-mcp] ❌ Project path required');
    console.error('[code-indexer-mcp] Usage: code-indexer-mcp <project-path>');
    console.error('[code-indexer-mcp] Example: code-indexer-mcp /path/to/your/project');
    process.exit(1);
  }

  if (!existsSync(projectPath)) {
    console.error(`[code-indexer-mcp] ❌ Project path does not exist: ${projectPath}`);
    process.exit(1);
  }

  if (!existsSync(MCP_SERVER)) {
    console.error('[code-indexer-mcp] ❌ Indexer not installed!');
    console.error('[code-indexer-mcp] Please run: npm install');
    console.error('[code-indexer-mcp] This will download and install the indexer from the develop branch.\n');
    process.exit(1);
  }

  checkForUpdatesBackground();

  try {
    console.error('[code-indexer-mcp] Starting MCP server...');
    console.error(`[code-indexer-mcp] Project: ${projectPath}`);
    
    const { McpServer } = await import(MCP_SERVER);
    
    if (typeof McpServer === 'function') {
      process.env.PROJECT_PATH = projectPath;
      await McpServer();
    } else if (McpServer && typeof McpServer.default === 'function') {
      process.env.PROJECT_PATH = projectPath;
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

main();
