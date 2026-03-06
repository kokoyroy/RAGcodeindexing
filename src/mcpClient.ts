/**
 * =============================================================================
 * MCP CLIENT - Test client for the MCP server
 * =============================================================================
 * 
 * This is a CLIENT that connects to the MCP server.
 * It's mainly used for testing the MCP server functionality.
 * 
 * WHAT IS AN MCP CLIENT?
 * --------------------
 * The client initiates communication with the server.
 * In production, the LLM (like Claude) acts as the client.
 * 
 * THIS FILE IS USEFUL FOR:
 * - Testing the MCP server locally
 * - Debugging MCP communication
 * - Running manual tests
 * 
 * HOW IT WORKS:
 * 1. Spawn the MCP server as a child process
 * 2. Connect via stdio (standard input/output)
 * 3. Send tool requests (search, reindex, stats)
 * 4. Receive responses
 * 
 * =============================================================================
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { spawn } from 'child_process';
import * as readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * =============================================================================
 * MCP INDEXER CLIENT CLASS
 * =============================================================================
 * 
 * A client wrapper for the MCP code indexer server.
 * Provides simple methods to call MCP tools.
 */

export class MCPIndexerClient {
  // MCP client connection
  private client: Client | null = null;
  
  // Transport mechanism (stdio)
  private transport: StdioClientTransport | null = null;
  
  // Child process running the server
  private process: ReturnType<typeof spawn> | null = null;

  /**
   * =============================================================================
   * CONNECT - Start the MCP server and establish connection
   * =============================================================================
   * 
   * This:
   * 1. Spawns the MCP server as a child process
   * 2. Creates a stdio transport to communicate with it
   * 3. Connects the client to the server
   * 
   * @param targetDir - Directory to index
   * 
   * HOW STDIO WORKS:
   * - Server reads queries from stdin
   * - Server writes responses to stdout
   * - It's like a conversation through console!
   * 
   * EXAMPLE:
   * await client.connect('/path/to/my/project');
   * // Now we can call tools!
   */
  async connect(targetDir: string): Promise<void> {
    const mcpScript = join(__dirname, 'mcpServer.js');
    
    // Create stdio transport - communicates via stdin/stdout
    this.transport = new StdioClientTransport({
      command: 'node',
      args: [mcpScript, targetDir],
      stderr: 'pipe',
    });

    // Create MCP client
    this.client = new Client(
      {
        name: 'code-indexer-client',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );

    // Connect client to server via transport
    await this.client.connect(this.transport);
  }

  /**
   * =============================================================================
   * SEARCH - Find relevant code chunks
   * =============================================================================
   * 
   * Calls the search_codebase tool on the MCP server.
   * 
   * @param query - Natural language search query
   * @param limit - Maximum results (default: 5)
   * @returns Search results as parsed JSON
   * 
   * EXAMPLE:
   * const results = await client.search("authentication function", 3);
   * Returns:
   * {
   *   "query": "authentication function",
   *   "count": 3,
   *   "results": [
   *     { "file": "src/auth.ts", "lines": "10-25", "similarity": "92%", "code": "..." },
   *     ...
   *   ]
   * }
   */
  async search(query: string, limit: number = 5): Promise<any> {
    if (!this.client) {
      throw new Error('Client not connected');
    }

    // Call the search_codebase tool
    const result = await this.client.callTool({
      name: 'search_codebase',
      arguments: { query, limit },
    }) as { content: Array<{ type: string; text: string }> };

    // Parse the JSON response from server
    return JSON.parse(result.content[0].text);
  }

  /**
   * =============================================================================
   * REINDEX - Force re-indexing of all files
   * =============================================================================
   * 
   * Calls the reindex_codebase tool on the MCP server.
   * Use this when code has changed and results seem outdated.
   * 
   * @returns Reindexing results as parsed JSON
   * 
   * EXAMPLE:
   * const result = await client.reindex();
   * Returns:
   * {
   *   "message": "Re-indexing complete",
   *   "filesScanned": 50,
   *   "filesChanged": 5,
   *   "chunksIndexed": 234,
   *   "duration": "1500ms"
   * }
   */
  async reindex(): Promise<any> {
    if (!this.client) {
      throw new Error('Client not connected');
    }

    const result = await this.client.callTool({
      name: 'reindex_codebase',
      arguments: {},
    }) as { content: Array<{ type: string; text: string }> };

    return JSON.parse(result.content[0].text);
  }

  /**
   * =============================================================================
   * GET STATS - Get index statistics
   * =============================================================================
   * 
   * Calls the get_index_stats tool on the MCP server.
   * 
   * @returns Statistics as parsed JSON
   * 
   * EXAMPLE:
   * const stats = await client.getStats();
   * Returns:
   * {
   *   "totalChunks": 234,
   *   "uniqueFiles": 12
   * }
   */
  async getStats(): Promise<any> {
    if (!this.client) {
      throw new Error('Client not connected');
    }

    const result = await this.client.callTool({
      name: 'get_index_stats',
      arguments: {},
    }) as { content: Array<{ type: string; text: string }> };

    return JSON.parse(result.content[0].text);
  }

  /**
   * =============================================================================
   * CLOSE - Disconnect and clean up
   * =============================================================================
   * 
   * Call this when done to:
   * - Kill the child process
   * - Clean up client resources
   * 
   * EXAMPLE:
   * await client.close();
   * // Connection closed
   */
  async close(): Promise<void> {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
    this.client = null;
    this.transport = null;
  }
}

/**
 * =============================================================================
 * TEST RUNNER - Run when file is executed directly
 * =============================================================================
 * 
 * If you run: node mcpClient.js /path/to/project
 * This test code will execute.
 * 
 * It:
 * 1. Connects to the MCP server
 * 2. Runs a test search
 * 3. Prints results
 * 4. Closes connection
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  // Get target directory from command line or use current directory
  const targetDir = process.argv[2] || process.cwd();
  const client = new MCPIndexerClient();
  
  console.log(`[Test] Connecting to MCP server for: ${targetDir}`);
  
  // Connect to server
  await client.connect(targetDir);
  
  // Run test search
  console.log('\n[Test] Running search...');
  const results = await client.search('function declaration', 3);
  console.log(JSON.stringify(results, null, 2));
  
  // Clean up
  await client.close();
}
