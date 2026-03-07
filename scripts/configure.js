#!/usr/bin/env node

import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');

const CLIENT_CONFIGS = {
  claude: {
    name: 'Claude Desktop / Claude Code',
    paths: [
      join(homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'),
      join(homedir(), '.config', 'claude', 'claude_desktop_config.json'),
    ],
  },
  opencode: {
    name: 'OpenCode',
    paths: [
      join(homedir(), '.config', 'opencode', 'opencode.json'),
    ],
  },
  cursor: {
    name: 'Cursor',
    paths: [
      join(homedir(), '.cursor', 'mcp.json'),
      join(homedir(), 'Library', 'Application Support', 'Cursor', 'User', 'globalStorage', 'mcp.json'),
    ],
  },
  vscode: {
    name: 'VS Code (with MCP extension)',
    paths: [
      join(homedir(), '.vscode', 'mcp.json'),
      join(homedir(), 'Library', 'Application Support', 'Code', 'User', 'mcp.json'),
    ],
  },
};

function findConfigPath(paths) {
  for (const configPath of paths) {
    if (existsSync(configPath)) {
      return configPath;
    }
  }
  return null;
}

function createConfig(configPath, clientName) {
  const configDir = dirname(configPath);
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  const packageDir = ROOT_DIR;

  const config = {
    mcpServers: {
      'code-indexer': {
        command: 'node',
        args: [join(packageDir, 'src', 'index.js'), '<PROJECT_PATH>']
      }
    }
  };

  writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log(`\n[Configure] Created ${clientName} config at: ${configPath}`);
  console.log(`[Configure] Config:\n${JSON.stringify(config, null, 2)}\n`);
  console.log('[Configure] ⚠️  Replace <PROJECT_PATH> with the path to your codebase\n');
}

function updateConfig(configPath, clientName) {
  const packageDir = ROOT_DIR;

  try {
    const config = JSON.parse(readFileSync(configPath, 'utf-8'));
    
    if (!config.mcpServers) {
      config.mcpServers = {};
    }

    config.mcpServers['code-indexer'] = {
      command: 'node',
      args: [join(packageDir, 'src', 'index.js'), '<PROJECT_PATH>']
    };

    writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`\n[Configure] Updated ${clientName} config at: ${configPath}`);
    console.log(`[Configure] Added code-indexer MCP server\n`);
    console.log('[Configure] ⚠️  Replace <PROJECT_PATH> with the path to your codebase\n');
  } catch (error) {
    console.error(`[Configure] Failed to update ${clientName} config:`, error.message);
    console.log('[Configure] Creating new config instead...');
    createConfig(configPath, clientName);
  }
}

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

function listClients() {
  console.log('\n[Configure] Checking for MCP clients...\n');
  
  const detected = [];
  const notDetected = [];
  
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
  
  if (notDetected.length > 0) {
    console.log('\nNot detected (config files not found):');
    notDetected.forEach(({ name }) => console.log(`  • ${name}`));
  }
  
  if (detected.length === 0) {
    console.log('\n[Configure] No MCP clients detected.');
    console.log('[Configure] You can still configure manually or install an MCP client.\n');
  } else {
    console.log(`\n[Configure] Found ${detected.length} MCP client(s).\n`);
    console.log('[Configure] Run: npm run configure <client>');
    console.log('[Configure] Or: npm run configure all\n');
  }
}

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
    console.log(`[Configure] Found existing config at: ${configPath}`);
    updateConfig(configPath, client.name);
  } else {
    console.log('[Configure] No existing config found');
    createConfig(client.paths[0], client.name);
  }
}

async function configure() {
  const args = process.argv.slice(2);
  const client = args[0];

  if (!client) {
    showHelp();
    process.exit(0);
  }

  if (client === 'list') {
    listClients();
    process.exit(0);
  }

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

  if (!CLIENT_CONFIGS[client]) {
    console.error(`\n[Configure] Unknown client: ${client}`);
    showHelp();
    process.exit(1);
  }

  configureClient(client);

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

configure();
