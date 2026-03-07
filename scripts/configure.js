#!/usr/bin/env node

import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');

const CLAUDE_CONFIG_PATHS = [
  join(homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'),
];

const OPENCODE_CONFIG_PATHS = [
  join(homedir(), '.config', 'opencode', 'opencode.json'),
];

function findConfigPath(paths) {
  for (const configPath of paths) {
    if (existsSync(configPath)) {
      return configPath;
    }
  }
  return null;
}

function createConfig(configPath, client) {
  const configDir = dirname(configPath);
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  const packageDir = process.cwd();
  const command = `node "${join(packageDir, 'src', 'index.js')}"`;

  const config = {
    mcpServers: {
      'code-indexer': {
        command: 'node',
        args: [join(packageDir, 'src', 'index.js'), '<PROJECT_PATH>']
      }
    }
  };

  writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log(`\n[Configure] Created ${client} config at: ${configPath}`);
  console.log(`[Configure] Config:\n${JSON.stringify(config, null, 2)}\n`);
  console.log('[Configure] ⚠️  Replace <PROJECT_PATH> with the path to your codebase\n');
}

function updateConfig(configPath, client) {
  const packageDir = process.cwd();
  const command = `node "${join(packageDir, 'src', 'index.js')}"`;

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
    console.log(`\n[Configure] Updated ${client} config at: ${configPath}`);
    console.log(`[Configure] Added code-indexer MCP server\n`);
    console.log('[Configure] ⚠️  Replace <PROJECT_PATH> with the path to your codebase\n');
  } catch (error) {
    console.error(`[Configure] Failed to update ${client} config:`, error.message);
    console.log('[Configure] Creating new config instead...');
    createConfig(configPath, client);
  }
}

async function configure() {
  console.log('\n[code-indexer-mcp] Configuration Helper\n');
  console.log('====================================\n');

  const args = process.argv.slice(2);
  const client = args[0];

  if (!client || !['claude', 'opencode', 'both'].includes(client.toLowerCase())) {
    console.log('Usage: npm run configure <claude|opencode|both>\n');
    console.log('Examples:');
    console.log('  npm run configure claude    - Configure Claude Desktop');
    console.log('  npm run configure opencode  - Configure OpenCode');
    console.log('  npm run configure both     - Configure both clients\n');
    process.exit(1);
  }

  const clientLower = client.toLowerCase();

  if (clientLower === 'claude' || clientLower === 'both') {
    console.log('\n[Configure] Configuring Claude Desktop...\n');
    const configPath = findConfigPath(CLAUDE_CONFIG_PATHS);
    
    if (configPath) {
      console.log(`[Configure] Found existing Claude config at: ${configPath}`);
      updateConfig(configPath, 'Claude Desktop');
    } else {
      console.log('[Configure] No existing Claude config found');
      createConfig(CLAUDE_CONFIG_PATHS[0], 'Claude Desktop');
    }
  }

  if (clientLower === 'opencode' || clientLower === 'both') {
    console.log('\n[Configure] Configuring OpenCode...\n');
    const configPath = findConfigPath(OPENCODE_CONFIG_PATHS);
    
    if (configPath) {
      console.log(`[Configure] Found existing OpenCode config at: ${configPath}`);
      updateConfig(configPath, 'OpenCode');
    } else {
      console.log('[Configure] No existing OpenCode config found');
      createConfig(OPENCODE_CONFIG_PATHS[0], 'OpenCode');
    }
  }

  console.log('\n[Configure] ✅ Configuration complete!\n');
  console.log('[Configure] Next steps:');
  console.log('1. Edit the config file');
  console.log('2. Replace <PROJECT_PATH> with your codebase path');
  console.log('3. Restart Claude Desktop or OpenCode\n');
  console.log('[Configure] Example paths:');
  console.log('  macOS: /Users/yourname/projects/my-project');
  console.log('  Linux: /home/yourname/projects/my-project');
  console.log('  Windows: C:\\Users\\yourname\\projects\\my-project\n');
}

configure();
