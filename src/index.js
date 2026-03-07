#!/usr/bin/env node

import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');
const INDEXER_DIR = join(ROOT_DIR, '.indexer');
const MCP_SERVER = join(INDEXER_DIR, 'dist', 'mcpServer.js');

if (!existsSync(MCP_SERVER)) {
  console.error('[code-indexer-mcp] ❌ Indexer not installed!');
  console.error('[code-indexer-mcp] Please run: npm install');
  console.error('[code-indexer-mcp] This will download and install the indexer from the develop branch.\n');
  process.exit(1);
}

try {
  const { McpServer } = await import(MCP_SERVER);
  
  if (typeof McpServer === 'function') {
    await McpServer();
  } else if (McpServer && typeof McpServer.default === 'function') {
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
