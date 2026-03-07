/**
 * =============================================================================
 * MCP SERVER - Model Context Protocol server for LLM integration
 * =============================================================================
 * 
 * This module turns the code indexer into an MCP server that can be
 * used by LLMs like Claude, GPT, or opencode.
 * 
 * WHAT IS MCP?
 * -----------
 * MCP = Model Context Protocol
 * 
 * It's a standardized way for LLMs to interact with external tools.
 * Think of it like an API, but simpler and designed specifically for AI.
 * 
 * MCP COMPONENTS:
 * --------------
 * 1. Server: Exposes tools (this file)
 * 2. Client: Calls the tools (the LLM)
 * 3. Transport: How they communicate (stdio in our case)
 * 
 * WHY STDIO?
 * ----------
 * "Standard Input/Output" - the same pipes used for console input/output.
 * Perfect for:
 * - Local processes
 * - Shell integration
 * - Simple communication
 * 
 * OUR MCP TOOLS:
 * -------------
 * 1. search_codebase(query, limit)
 *    - Find relevant code using natural language
 * 
 * 2. reindex_codebase()
 *    - Re-index all files (for when code changes)
 * 
 * 3. get_index_stats()
 *    - Get statistics about indexed code
 * 
 * 4. check_for_updates()
 *    - Check if a new version is available
 * 
 * 5. install_update()
 *    - Download and install latest version
 * 
 * 6. get_version()
 *    - Get current installed version info
 * 
 * =============================================================================
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { indexer } from './indexer.js';
import { db, SearchResult } from './database.js';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');
const INDEXER_DIR = join(ROOT_DIR, '.indexer');
const VERSION_FILE = join(INDEXER_DIR, 'VERSION');

/**
 * =============================================================================
 * MAIN FUNCTION - Start the MCP server
 * =============================================================================
 * 
 * Usage: npm run mcp -- /path/to/project
 * 
 * WHAT HAPPENS:
 * 1. Parse command line for target directory
 * 2. Initialize indexer
 * 3. Index the codebase (once, on startup)
 * 4. Create MCP server with tools
 * 5. Wait for LLM to call tools via stdio
 */
async function main() {
  // Get target directory from command line
  const targetDir = process.argv[2] || process.cwd();

  console.log('[MCP] Initializing Code Indexer MCP Server...');
  console.log(`[MCP] Target directory: ${targetDir}`);

  try {
    // ==================== STEP 1: INITIALIZE ====================
    // Set up the indexer (connect DB, load model)
    await indexer.initialize();

    // ==================== STEP 2: INDEX ====================
    // Index the codebase once when server starts
    const stats = await indexer.index({
      targetDir: targetDir,
      forceReindex: false, // Use incremental indexing
    });

    console.log(`[MCP] Indexed ${stats.chunksIndexed} chunks from ${stats.filesChanged} files`);

    // ==================== STEP 3: CREATE SERVER ====================
    // Create an MCP server instance
    const server = new Server(
      {
        name: 'code-indexer',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {}, // We'll register tools below
        },
      }
    );

    /**
     * =============================================================================
     * TOOL LIST HANDLER - Tell the LLM what tools are available
     * =============================================================================
     * 
     * When the LLM connects, it asks "what tools do you have?"
     * We respond with a list of our available tools and their descriptions.
     * 
     * This helps the LLM know WHEN to use each tool.
     * 
     * TOOL DESCRIPTIONS ARE IMPORTANT!
     * - They help the LLM decide when to call each tool
     * - Be specific about what each tool does
     * - Give examples of queries that match
     */
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          /**
           * SEARCH TOOL - Find code using natural language
           * -------------------------
           * This is the MAIN tool for code search.
           * 
           * WHEN TO USE:
           * - User asks about code structure
           * - User wants to find a specific function
           * - User asks "how does X work?"
           * - Any question about the codebase
           * 
           * PARAMETERS:
           * - query: What to search for (natural language!)
           * - limit: How many results (default: 5)
           * 
           * EXAMPLE LLM PROMPT:
           * "Find the authentication function"
           * → LLM calls search_codebase("Find the authentication function")
           */
          {
            name: 'search_codebase',
            description: 'Search the indexed codebase using natural language. Returns relevant code chunks with file paths and line numbers. Use this when the user asks about code, functions, classes, or wants to find specific implementations.',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Natural language search query (e.g., "function that handles authentication", "API endpoint for users")',
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of results to return',
                  default: 5,
                },
              },
              required: ['query'],
            },
          },

          /**
           * REINDEX TOOL - Update the index
           * -------------------------
           * Re-indexes all files (even unchanged ones).
           * 
           * WHEN TO USE:
           * - User says code has changed
           * - Search results seem outdated
           * - After a git pull or merge
           * 
           * NOTE: This is slower than incremental indexing!
           * Only use when necessary.
           */
          {
            name: 'reindex_codebase',
            description: 'Re-index the entire codebase. Use this when files have changed and you need to update the index to get accurate search results.',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },

          /**
           * STATS TOOL - Get index information
           * -------------------------
           * Returns statistics about the indexed codebase.
           * 
           * WHEN TO USE:
           * - User asks "how much is indexed?"
           * - Debugging search issues
           * - General information request
           */
          {
            name: 'get_index_stats',
            description: 'Get statistics about the current index - total chunks, unique files, database info.',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },

          {
            name: 'check_for_updates',
            description: 'Check if a new version of code-indexer is available on GitHub. Returns current version, latest version, and whether an update is available.',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },

          {
            name: 'install_update',
            description: 'Download and install the latest version of code-indexer from GitHub. Requires a restart after installation to apply changes.',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },

          {
            name: 'get_version',
            description: 'Get the current installed version of code-indexer and the indexer component.',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
        ],
      };
    });

    /**
     * =============================================================================
     * TOOL CALL HANDLER - Execute tool requests
     * =============================================================================
     * 
     * When the LLM wants to use a tool, it sends a request here.
     * We execute the tool and return the results.
     * 
     * THE LLM SENDS:
     * - tool name (e.g., "search_codebase")
     * - arguments (e.g., {query: "auth function", limit: 5})
     * 
     * WE RETURN:
     * - success: JSON with results
     * - error: Error message
     */
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      // ===== SEARCH TOOL =====
      if (name === 'search_codebase') {
        const query = (args?.query as string) || '';
        const limit = (args?.limit as number) || 5;

        console.log(`[MCP] Search: "${query}"`);
        
        // Call our indexer's search function
        const results = await indexer.search(query, limit);

        // Format results for the LLM
        const formattedResults = results.map((r: SearchResult) => ({
          file: r.file_path,
          lines: `${r.start_line}-${r.end_line}`,
          similarity: `${((r.similarity ?? 0) * 100).toFixed(1)}%`,
          code: r.chunk_text.substring(0, 500) + (r.chunk_text.length > 500 ? '...' : ''),
        }));

        // Return as JSON text (MCP format)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                query,
                count: results.length,
                results: formattedResults,
              }, null, 2),
            },
          ],
        };
      }

      // ===== REINDEX TOOL =====
      if (name === 'reindex_codebase') {
        console.log('[MCP] Re-indexing codebase...');
        
        // Force re-index everything
        const stats = await indexer.index({
          targetDir: targetDir,
          forceReindex: true,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                message: 'Re-indexing complete',
                filesScanned: stats.filesScanned,
                filesChanged: stats.filesChanged,
                chunksIndexed: stats.chunksIndexed,
                duration: `${stats.duration}ms`,
              }, null, 2),
            },
          ],
        };
      }

      // ===== STATS TOOL =====
      if (name === 'get_index_stats') {
        // Get all chunks from database
        const chunks = db.getAllChunks();
        
        // Count unique files
        const uniqueFiles = new Set(chunks.map(c => c.file_path));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                totalChunks: chunks.length,
                uniqueFiles: uniqueFiles.size,
              }, null, 2),
            },
          ],
        };
      }

      // ===== CHECK FOR UPDATES TOOL =====
      if (name === 'check_for_updates') {
        console.log('[MCP] Checking for updates...');
        
        try {
          const updateScript = join(INDEXER_DIR, '..', 'scripts', 'update.js');
          const { checkForUpdates } = await import(`file://${updateScript}`);
          
          const result = await checkForUpdates(5000);
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  hasUpdate: false,
                  error: error instanceof Error ? error.message : 'Failed to check for updates',
                }, null, 2),
              },
            ],
          };
        }
      }

      // ===== INSTALL UPDATE TOOL =====
      if (name === 'install_update') {
        console.log('[MCP] Installing update...');
        
        try {
          const updateScript = join(INDEXER_DIR, '..', 'scripts', 'update.js');
          const { installUpdate } = await import(`file://${updateScript}`);
          
          const result = await installUpdate();
          
          if (result.success) {
            result.message += '\n\n⚠️  IMPORTANT: Please restart Claude/OpenCode for the update to take effect.';
          }
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: false,
                  error: error instanceof Error ? error.message : 'Failed to install update',
                }, null, 2),
              },
            ],
          };
        }
      }

      // ===== GET VERSION TOOL =====
      if (name === 'get_version') {
        try {
          const updateScript = join(INDEXER_DIR, '..', 'scripts', 'update.js');
          const { getVersionInfo } = await import(`file://${updateScript}`);
          
          const result = getVersionInfo();
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        } catch (error) {
          const packageJsonPath = join(ROOT_DIR, 'package.json');
          const packageVersion = existsSync(packageJsonPath) 
            ? JSON.parse(readFileSync(packageJsonPath, 'utf-8')).version 
            : 'unknown';
          
          let indexerVersion = 'not installed';
          if (existsSync(VERSION_FILE)) {
            indexerVersion = readFileSync(VERSION_FILE, 'utf-8').trim();
          }
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  packageVersion,
                  indexerVersion,
                  indexerInstalled: existsSync(INDEXER_DIR),
                }, null, 2),
              },
            ],
          };
        }
      }

      // Unknown tool - should not happen if list is correct
      throw new Error(`Unknown tool: ${name}`);
    });

    // ==================== STEP 4: CONNECT ====================
    // Create stdio transport (reads from stdin, writes to stdout)
    const transport = new StdioServerTransport();
    
    // Connect the server to the transport
    await server.connect(transport);
    
    console.log('[MCP] Server running on stdio');
    console.log('[MCP] Ready for queries!');

    // Server is now waiting for LLM calls
    // It will stay running until the LLM disconnects or we kill it

  } catch (error) {
    console.error('[MCP] Error:', error);
    process.exit(1);
  }
}

// Start the MCP server!
main();
