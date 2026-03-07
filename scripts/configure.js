#!/usr/bin/env node

/**
 * =============================================================================
 * CONFIGURE SCRIPT - Set up MCP client configurations
 * =============================================================================
 * 
 * This script configures code-indexer-mcp for various MCP-compatible clients.
 * 
 * WHAT DOES THIS SCRIPT DO?
 * -------------------------
 * 1. Detects installed MCP clients (Claude, OpenCode, Cursor, VS Code)
 * 2. Creates or updates MCP configuration files
 * 3. Adds code-indexer-mcp server configuration
 * 4. Provides guidance for manual configuration
 * 
 * WHY DO WE NEED THIS?
 * -------------------
 * - Different MCP clients have different config file locations
 * - Automates the setup process for users
 * - Ensures correct configuration format
 * - Makes it easy to switch between clients
 * 
 * SUPPORTED CLIENTS:
 * -----------------
 * - Claude Desktop / Claude Code (claude)
 * - OpenCode (opencode)
 * - Cursor (cursor)
 * - VS Code with MCP extension (vscode)
 * 
 * USAGE:
 * ------
 * List detected clients:
 *   npm run configure list
 * 
 * Configure specific client:
 *   npm run configure claude
 *   npm run configure opencode
 *   npm run configure cursor
 *   npm run configure vscode
 * 
 * Configure all detected clients:
 *   npm run configure all
 * 
 * ARCHITECTURE:
 * ------------
 * npm run configure <client>
 *      ↓
 * [This script runs]
 *      ↓
 * Searches for client config file
 *      ↓
 * If found: Updates existing config
 * If not found: Creates new config
 *      ↓
 * Adds code-indexer MCP server entry:
 * {
 *   "mcpServers": {
 *     "code-indexer": {
 *       "command": "node",
 *       "args": ["path/to/src/index.js", "<PROJECT_PATH>"]
 *     }
 *   }
 * }
 *      ↓
 * User edits <PROJECT_PATH>
 *      ↓
 * Ready to use!
 * 
 * =============================================================================
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';

// ============================================================================
// CONSTANTS - Configuration paths and directory setup
// ============================================================================

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');

// ============================================================================
// CLIENT CONFIGURATIONS - Define supported MCP clients and their config paths
// ============================================================================

/**
 * Map of supported MCP clients with their names and config file paths.
 * 
 * STRUCTURE:
 * {
 *   clientKey: {
 *     name: 'Display Name',
 *     paths: [list of possible config file locations]
 *   }
 * }
 * 
 * PATHS ORDER:
 * - First path is preferred location
 * - Script tries each path in order
 * - First existing path is used
 */
const CLIENT_CONFIGS = {
  claude: {
    name: 'Claude Desktop / Claude Code',
    paths: [
      // macOS location
      join(homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'),
      // Linux location
      join(homedir(), '.config', 'claude', 'claude_desktop_config.json'),
    ],
  },
  opencode: {
    name: 'OpenCode',
    paths: [
      // Linux/macOS location
      join(homedir(), '.config', 'opencode', 'opencode.json'),
    ],
  },
  cursor: {
    name: 'Cursor',
    paths: [
      // User home directory location
      join(homedir(), '.cursor', 'mcp.json'),
      // macOS Application Support location
      join(homedir(), 'Library', 'Application Support', 'Cursor', 'User', 'globalStorage', 'mcp.json'),
    ],
  },
  vscode: {
    name: 'VS Code (with MCP extension)',
    paths: [
      // User home directory location
      join(homedir(), '.vscode', 'mcp.json'),
      // macOS Application Support location
      join(homedir(), 'Library', 'Application Support', 'Code', 'User', 'mcp.json'),
    ],
  },
};

// ============================================================================
// FIND CONFIG PATH - Locate client config file
// ============================================================================

/**
 * Searches for an existing config file in the list of possible paths.
 * 
 * @param {string[]} paths - Array of possible config file paths
 * @returns {string|null} - First existing path or null if none found
 */
function findConfigPath(paths) {
  for (const configPath of paths) {
    if (existsSync(configPath)) {
      return configPath;
    }
  }
  return null;
}

// ============================================================================
// CREATE CONFIG - Create a new MCP config file
// ============================================================================

/**
 * Creates a new MCP configuration file with code-indexer server entry.
 * 
 * @param {string} configPath - Path where config should be created
 * @param {string} clientName - Display name of the client
 * 
 * WHAT IT DOES:
 * 1. Creates parent directories if needed
 * 2. Creates minimal config with code-indexer server
 * 3. Writes to disk
 * 4. Instructs user to edit <PROJECT_PATH>
 */
function createConfig(configPath, clientName) {
  // Create parent directories if they don't exist
  const configDir = dirname(configPath);
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  const packageDir = ROOT_DIR;

  // Create minimal MCP configuration
  const config = {
    mcpServers: {
      'code-indexer': {
        command: 'node',
        args: [join(packageDir, 'src', 'index.js'), '<PROJECT_PATH>']
      }
    }
  };

  // Write config to file
  writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log(`\n[Configure] Created ${clientName} config at: ${configPath}`);
  console.log(`[Configure] Config:\n${JSON.stringify(config, null, 2)}\n`);
  console.log('[Configure] ⚠️  Replace <PROJECT_PATH> with the path to your codebase\n');
}

// ============================================================================
// UPDATE CONFIG - Update existing MCP config file
// ============================================================================

/**
 * Updates an existing MCP configuration file by adding code-indexer server.
 * 
 * @param {string} configPath - Path to existing config file
 * @param {string} clientName - Display name of the client
 * 
 * WHAT IT DOES:
 * 1. Reads existing config
 * 2. Adds or updates code-indexer server entry
 * 3. Preserves other MCP servers
 * 4. Writes back to disk
 */
function updateConfig(configPath, clientName) {
  const packageDir = ROOT_DIR;

  try {
    // Read existing config
    const config = JSON.parse(readFileSync(configPath, 'utf-8'));
    
    // Ensure mcpServers object exists
    if (!config.mcpServers) {
      config.mcpServers = {};
    }

    // Add or update code-indexer server
    config.mcpServers['code-indexer'] = {
      command: 'node',
      args: [join(packageDir, 'src', 'index.js'), '<PROJECT_PATH>']
    };

    // Write updated config
    writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`\n[Configure] Updated ${clientName} config at: ${configPath}`);
    console.log(`[Configure] Added code-indexer MCP server\n`);
    console.log('[Configure] ⚠️  Replace <PROJECT_PATH> with the path to your codebase\n');
  } catch (error) {
    // If update fails, create new config
    console.error(`[Configure] Failed to update ${clientName} config:`, error.message);
    console.log('[Configure] Creating new config instead...');
    createConfig(configPath, clientName);
  }
}

// ============================================================================
// SHOW HELP - Display usage information
// ============================================================================

/**
 * Displays help text with usage instructions and examples.
 */
function showHelp() {
  console.log('\n[code-indexer-mcp] Configuration Helper\n');
  console.log('====================================\n');
  console.log('This tool configures code-indexer-mcp for MCP-compatible clients.\n');
  console.log('Supported clients:');
  console.log('  • Claude Desktop / Claude Code');
  console.log('  • OpenCode');
  console.log('  • Cursor');
  console.log('  • VS Code (with MCP extension)');
  console.log('  • Any other MCP-compatible client\n');
  console.log('Usage: npm run configure <client>\n');
  console.log('Clients:');
  console.log('  claude    - Claude Desktop / Claude Code');
  console.log('  opencode  - OpenCode');
  console.log('  cursor    - Cursor IDE');
  console.log('  vscode    - VS Code (with MCP extension)');
  console.log('  all       - Configure all detected clients');
  console.log('  list      - List detected MCP clients\n');
  console.log('Examples:');
  console.log('  npm run configure claude');
  console.log('  npm run configure opencode');
  console.log('  npm run configure all\n');
}

// ============================================================================
// LIST CLIENTS - Show detected MCP clients
// ============================================================================

/**
 * Scans for installed MCP clients and displays their config locations.
 */
function listClients() {
  console.log('\n[Configure] Checking for MCP clients...\n');
  
  const detected = [];
  const notDetected = [];
  
  // Check each client
  for (const [key, client] of Object.entries(CLIENT_CONFIGS)) {
    const configPath = findConfigPath(client.paths);
    if (configPath) {
      detected.push({ key, name: client.name, path: configPath });
      console.log(`✅ ${client.name}`);
      console.log(`   Config: ${configPath}\n`);
    } else {
      notDetected.push({ key, name: client.name });
    }
  }
  
  // Show clients not detected
  if (notDetected.length > 0) {
    console.log('\nNot detected (config files not found):');
    notDetected.forEach(({ name }) => console.log(`  • ${name}`));
  }
  
  // Show next steps
  if (detected.length === 0) {
    console.log('\n[Configure] No MCP clients detected.');
    console.log('[Configure] You can still configure manually or install an MCP client.\n');
  } else {
    console.log(`\n[Configure] Found ${detected.length} MCP client(s).\n`);
    console.log('[Configure] Run: npm run configure <client>');
    console.log('[Configure] Or: npm run configure all\n');
  }
}

// ============================================================================
// CONFIGURE CLIENT - Configure a specific MCP client
// ============================================================================

/**
 * Configures a specific MCP client by creating or updating its config.
 * 
 * @param {string} clientKey - Key from CLIENT_CONFIGS (e.g., 'claude', 'opencode')
 */
function configureClient(clientKey) {
  const client = CLIENT_CONFIGS[clientKey];
  if (!client) {
    console.error(`[Configure] Unknown client: ${clientKey}`);
    console.log('[Configure] Run: npm run configure list\n');
    process.exit(1);
  }

  console.log(`\n[Configure] Configuring ${client.name}...\n`);
  const configPath = findConfigPath(client.paths);
  
  if (configPath) {
    // Update existing config
    console.log(`[Configure] Found existing config at: ${configPath}`);
    updateConfig(configPath, client.name);
  } else {
    // Create new config
    console.log('[Configure] No existing config found');
    createConfig(client.paths[0], client.name);
  }
}

// ============================================================================
// MAIN CONFIGURE FUNCTION - CLI entry point
// ============================================================================

/**
 * Main function that handles CLI arguments and orchestrates configuration.
 */
async function configure() {
  const args = process.argv.slice(2);
  const client = args[0];

  // No arguments - show help
  if (!client) {
    showHelp();
    process.exit(0);
  }

  // List clients
  if (client === 'list') {
    listClients();
    process.exit(0);
  }

  // Configure all detected clients
  if (client === 'all') {
    console.log('\n[Configure] Configuring all detected MCP clients...\n');
    
    let configured = 0;
    for (const [key, clientData] of Object.entries(CLIENT_CONFIGS)) {
      const configPath = findConfigPath(clientData.paths);
      if (configPath) {
        configureClient(key);
        configured++;
      }
    }
    
    if (configured === 0) {
      console.log('[Configure] No MCP clients detected.');
      console.log('[Configure] Run: npm run configure list\n');
    } else {
      console.log(`\n[Configure] ✅ Configured ${configured} client(s)!\n`);
    }
    process.exit(0);
  }

  // Unknown client
  if (!CLIENT_CONFIGS[client]) {
    console.error(`\n[Configure] Unknown client: ${client}`);
    showHelp();
    process.exit(1);
  }

  // Configure specific client
  configureClient(client);

  // Show next steps
  console.log('\n[Configure] ✅ Configuration complete!\n');
  console.log('[Configure] Next steps:');
  console.log('1. Edit the config file');
  console.log('2. Replace <PROJECT_PATH> with your codebase path');
  console.log(`3. Restart ${CLIENT_CONFIGS[client].name}\n`);
  console.log('[Configure] Example paths:');
  console.log('  macOS: /Users/yourname/projects/my-project');
  console.log('  Linux: /home/yourname/projects/my-project');
  console.log('  Windows: C:\\Users\\yourname\\projects\\my-project\n');
}

// Run the configuration
configure();
