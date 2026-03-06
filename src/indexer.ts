/**
 * =============================================================================
 * INDEXER MODULE - Orchestrates the entire RAG pipeline with progress feedback
 * =============================================================================
 * 
 * This is the MAIN ORCHESTRATOR that ties everything together!
 * 
 * WHAT DOES "ORCHESTRATOR" MEAN?
 * -----------------------------
 * It coordinates multiple components to do one big job:
 * 1. FileScanner: finds files
 * 2. SemanticChunker: parses code into chunks
 * 3. Embedder: converts text to vectors
 * 4. Database: stores everything
 * 
 * THE RAG PIPELINE:
 * -----------------
 * 1. SCAN: Find all .js/.ts/.tsx files
 * 2. READ: Load file contents
 * 3. FILTER: Skip unchanged files (incremental indexing)
 * 4. CHUNK: Parse code into semantic units (functions, classes)
 * 5. EMBED: Convert each chunk to a 384-dim vector
 * 6. STORE: Save chunks + embeddings to SQLite
 * 
 * WHY SEPARATE STEPS?
 * ------------------
 * - Each step is complex enough to deserve its own module
 * - Easy to debug and test individually
 * - Can swap components (e.g., different chunker or embedder)
 * 
 * WHAT IS RAG?
 * ------------
 * Retrieval-Augmented Generation
 * 
 * Instead of:
 * - User asks: "how does auth work?"
 * - LLM answers from its training data (may be outdated)
 * 
 * With RAG:
 * - User asks: "how does auth work?"
 * - We search OUR codebase for relevant code
 * - We give the code to the LLM
 * - LLM gives accurate, context-aware answer
 * 
 * =============================================================================
 */

import { FileScanner, FileInfo } from './fileScanner.js';
import { SemanticChunker, Chunk } from './semanticChunker.js';
import { embedder } from './embedder.js';
import { db, CodeChunk, SearchResult } from './database.js';
import md5 from 'md5';

/**
 * =============================================================================
 * INTERFACES - Configuration and statistics
 * =============================================================================
 */

// Options for configuring the indexer
export interface IndexerOptions {
  targetDir: string;              // Directory to index
  forceReindex?: boolean;          // Skip incremental, re-index everything
  concurrency?: number;           // How many parallel workers (default: 10)
}

// Statistics about the indexing operation
export interface IndexerStats {
  filesScanned: number;           // Total files found
  filesChanged: number;            // Files that needed re-indexing
  chunksExtracted: number;        // Code chunks parsed
  chunksIndexed: number;          // Chunks saved to DB
  errors: number;                 // Errors encountered
  duration: number;               // Time taken (milliseconds)
}

/**
 * =============================================================================
 * HELPER: Parallel processing with concurrency limit
 * =============================================================================
 * 
 * Process items in parallel, but limit how many run at once.
 * This prevents overwhelming the system with too many async tasks.
 * 
 * @param items - Array of items to process
 * @param mapper - Function to transform each item
 * @param concurrency - Max parallel tasks
 * @returns Array of results in same order as input
 * 
 * WHY CONCURRENCY LIMIT?
 * - Without limit: 1000 files = 1000 simultaneous operations
 * - With limit=10: Only 10 at a time, system stays responsive
 * - Balance between speed and resource usage
 */
async function parallelMap<T, R>(
  items: T[],
  mapper: (item: T) => Promise<R>,
  concurrency: number
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  // Each worker pulls the next item when ready
  async function worker(): Promise<void> {
    while (index < items.length) {
      const currentIndex = index++;
      try {
        results[currentIndex] = await mapper(items[currentIndex]);
      } catch (error) {
        results[currentIndex] = null as R;
      }
    }
  }

  // Start N workers that share the work
  const workers = Array(concurrency).fill(null).map(() => worker());
  await Promise.all(workers);

  return results;
}

/**
 * =============================================================================
 * HELPER: Progress bar display
 * =============================================================================
 * 
 * Shows a visual progress bar in the terminal.
 * 
 * @param current - Current progress count
 * @param total - Total items to process
 * @param label - Description of what's happening
 * @param startTime - When processing started (for ETA calculation)
 * 
 * EXAMPLE OUTPUT:
 * [Indexer] Reading files: [████████████░░░░░░░] 60% (600/1000) | 12.5s elapsed, ~8s remaining
 */
function showProgress(current: number, total: number, label: string, startTime?: number): void {
  const percentage = Math.round((current / total) * 100);
  const filled = Math.round((percentage / 100) * 20);
  const empty = 20 - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  
  let timing = '';
  if (startTime && current > 0) {
    const elapsed = Date.now() - startTime;
    const rate = current / (elapsed / 1000);
    const remaining = (total - current) / rate;
    timing = ` | ${(elapsed / 1000).toFixed(1)}s elapsed, ~${remaining.toFixed(0)}s remaining`;
  }
  
  // \r returns cursor to start of line (overwrites previous progress)
  const output = `\r\x1b[K[Indexer] ${label}: [${bar}] ${percentage}% (${current}/${total})${timing}`;
  process.stdout.write(output);
  
  // Force flush to ensure immediate display
  if ((process.stdout as any).clearLine) {
    process.stdout.write('');
  }
  
  if (current === total) {
    process.stdout.write('\n');
  }
}

/**
 * =============================================================================
 * INDEXER CLASS - Main orchestration class
 * =============================================================================
 */

export class Indexer {
  // Component dependencies
  private fileScanner: FileScanner;
  private chunker: SemanticChunker;
  
  // Track initialization state
  private isInitialized: boolean = false;

  /**
   * =============================================================================
   * CONSTRUCTOR - Set up dependencies
   * =============================================================================
   */
  constructor() {
    this.fileScanner = new FileScanner();
    this.chunker = new SemanticChunker();
  }

  /**
   * =============================================================================
   * INITIALIZE - Set up database and ML model
   * =============================================================================
   * 
   * Must be called before any indexing or search!
   * 
   * WHAT IT DOES:
   * 1. Connects to SQLite database
   * 2. Loads the embedding model (~70MB, cached after first run)
   * 
   * WHY SEPARATE FROM CONSTRUCTOR?
   * - Async operations (database connection, model download)
   * - Allows error handling at startup
   * - Makes testing easier (can mock dependencies)
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    await db.connect();
    await embedder.initialize();
    this.isInitialized = true;
  }

  /**
   * =============================================================================
   * INDEX - Main entry point for indexing
   * =============================================================================
   * 
   * This runs the complete RAG pipeline!
   * 
   * @param options - Configuration for what/how to index
   * @returns Statistics about the indexing operation
   * 
   * PIPELINE STEPS:
   * ---------------
   * 
   * STEP 1: SCAN
   * Find all .js/.ts/.tsx files in target directory
   * Uses FileScanner to recursively find files
   * 
   * STEP 2: READ
   * Load contents of each file
   * Also compute MD5 hash for change detection
   * 
   * STEP 3: FILTER (Incremental Indexing)
   * Compare current file hashes with stored hashes
   * Only process files that changed (or new files)
   * This saves TONS of time on large codebases!
   * 
   * STEP 4: CHUNK
   * Use Tree-sitter to parse each file into semantic chunks
   * Each chunk = function, class, or other logical unit
   * 
   * STEP 5: EMBED
   * Convert each chunk's text to a 384-dim vector
   * This is the SLOWEST step (ML inference)
   * Progress bar helps track it
   * 
   * STEP 6: STORE
   * Save all chunks + embeddings to SQLite
   * Uses batch insert for speed
   * 
   * EXAMPLE:
   * await indexer.index({ targetDir: '/path/to/project' })
   * Returns: { filesScanned: 50, filesChanged: 12, chunksIndexed: 234, ... }
   */
  async index(options: IndexerOptions): Promise<IndexerStats> {
    if (!this.isInitialized) {
      throw new Error('Indexer not initialized. Call initialize() first.');
    }

    const startTime = Date.now();
    const concurrency = options.concurrency || 10;
    
    const stats: IndexerStats = {
      filesScanned: 0,
      filesChanged: 0,
      chunksExtracted: 0,
      chunksIndexed: 0,
      errors: 0,
      duration: 0,
    };

    try {
      console.log(`[Indexer] Starting indexing of: ${options.targetDir}`);

      // STEP 1: SCAN - Find all relevant files
      const filePaths = await this.fileScanner.scan(options.targetDir);
      stats.filesScanned = filePaths.length;
      console.log(`[Indexer] Found ${filePaths.length} supported files`);

      if (filePaths.length === 0) {
        console.log('[Indexer] No files to index');
        return stats;
      }

      // STEP 2: READ - Load file contents with progress
      console.log(`[Indexer] Reading files...`);
      const readStartTime = Date.now();
      let readCount = 0;
      const fileInfos: FileInfo[] = [];
      
      await Promise.all(filePaths.map(async (filePath) => {
        try {
          const fileInfo = await this.fileScanner.readFile(filePath);
          if (fileInfo) {
            fileInfos.push(fileInfo);
          }
          readCount++;
          showProgress(readCount, filePaths.length, 'Reading files', readStartTime);
        } catch (error) {
          console.error(`\n[Indexer] Error reading ${filePath}:`, error);
          stats.errors++;
        }
      }));

      // STEP 3: FILTER - Skip unchanged files
      const existingHashes = db.getAllFileHashes();
      const filesToIndex = options.forceReindex
        ? fileInfos
        : this.fileScanner.filterChangedFiles(fileInfos, existingHashes);

      stats.filesChanged = filesToIndex.length;
      console.log(`[Indexer] ${options.forceReindex ? 'Re-indexing' : 'Indexing'} ${filesToIndex.length} changed files`);

      if (filesToIndex.length === 0) {
        stats.duration = Date.now() - startTime;
        console.log(`[Indexer] Indexing complete in ${stats.duration}ms`);
        return stats;
      }

      // STEP 4: CHUNK - Parse code into semantic units
      console.log(`[Indexer] Parsing code into chunks...`);
      const allChunks: Array<{ fileInfo: FileInfo; chunk: Chunk }> = [];
      
      for (let i = 0; i < filesToIndex.length; i++) {
        const fileInfo = filesToIndex[i];
        try {
          const chunks = this.chunker.chunk(fileInfo.path, fileInfo.content);
          stats.chunksExtracted += chunks.length;
          for (const chunk of chunks) {
            allChunks.push({ fileInfo, chunk });
          }
          showProgress(i + 1, filesToIndex.length, 'Parsing files');
        } catch (error) {
          console.error(`\n[Indexer] Error chunking ${fileInfo.path}:`, error);
          stats.errors++;
        }
      }

      console.log(`[Indexer] Extracted ${allChunks.length} code chunks`);

      if (allChunks.length === 0) {
        stats.duration = Date.now() - startTime;
        console.log(`[Indexer] Indexing complete in ${stats.duration}ms`);
        return stats;
      }

      // STEP 5: EMBED - Convert chunks to vectors (slowest step!)
      console.log(`[Indexer] Generating embeddings (this may take a while)...`);
      const embedStartTime = Date.now();
      let completedEmbeddings = 0;
      
      // Process embeddings with limited concurrency for smooth progress
      const chunkWithEmbeddings = await parallelMap(
        allChunks,
        async ({ fileInfo, chunk }) => {
          try {
            const embedding = await embedder.embed(chunk.text);
            completedEmbeddings++;
            showProgress(completedEmbeddings, allChunks.length, 'Generating embeddings', embedStartTime);
            return { fileInfo, chunk, embedding };
          } catch (error) {
            console.error(`\n[Indexer] Error embedding chunk from ${fileInfo.path}:`, error);
            stats.errors++;
            return null;
          }
        },
        concurrency
      );

      const validChunks = chunkWithEmbeddings.filter((c): c is NonNullable<typeof c> => c !== null);

      // STEP 6: STORE - Save to database
      console.log(`[Indexer] Storing chunks in database...`);
      const codeChunks: CodeChunk[] = validChunks.map(({ fileInfo, chunk, embedding }) => ({
        file_path: fileInfo.path,
        file_hash: fileInfo.hash,
        chunk_text: chunk.text,
        start_line: chunk.startLine,
        end_line: chunk.endLine,
        content_hash: md5(chunk.text),
        embedding: embedding,
      }));

      const insertedCount = db.insertChunksBatch(codeChunks);
      stats.chunksIndexed = insertedCount;

      // Calculate total duration
      stats.duration = Date.now() - startTime;
      console.log(`[Indexer] ✅ Indexing complete in ${stats.duration}ms`);
      console.log(`[Indexer] Stats: ${stats.filesScanned} files, ${stats.chunksExtracted} chunks extracted, ${stats.chunksIndexed} chunks indexed`);

      return stats;
    } catch (error) {
      console.error('[Indexer] Indexing failed:', error);
      stats.errors++;
      throw error;
    }
  }

  /**
   * =============================================================================
   * SEARCH - Find relevant code chunks
   * =============================================================================
   * 
   * This is the RAG "retrieval" part!
   * 
   * @param query - Natural language search query
   * @param limit - Maximum results to return (default: 5)
   * @returns Array of SearchResult sorted by similarity
   * 
   * HOW IT WORKS:
   * 1. Convert query to embedding using the ML model
   * 2. Search database for similar vectors
   * 3. Return most similar code chunks
   * 
   * EXAMPLE:
   * const results = await indexer.search("how to authenticate users");
   * 
   * Returns:
   * [
   *   { file_path: "src/auth.ts", chunk_text: "function login() {...}", similarity: 0.92 },
   *   { file_path: "src/middleware.ts", chunk_text: "function verifyToken() {...}", similarity: 0.87 },
   *   ...
   * ]
   */
  async search(query: string, limit: number = 5): Promise<SearchResult[]> {
    if (!this.isInitialized) {
      throw new Error('Indexer not initialized. Call initialize() first.');
    }

    try {
      console.log(`[Indexer] Searching for: "${query}"`);
      
      // Step 1: Convert query to vector
      const queryEmbedding = await embedder.embed(query);
      
      // Step 2: Find similar chunks in database
      const results = await db.searchSimilar(queryEmbedding, limit);
      
      console.log(`[Indexer] Found ${results.length} results`);
      return results;
    } catch (error) {
      console.error('[Indexer] Search failed:', error);
      return [];
    }
  }

  /**
   * =============================================================================
   * SHUTDOWN - Clean up resources
   * =============================================================================
   * 
   * Call this when done to:
   * - Release the embedding model from memory
   * - Close database connection
   * - Allow process to exit cleanly
   * 
   * WHY IMPORTANT?
   * - Database connections hold file locks
   * - ML model uses GPU/memory
   * - Without cleanup, process might hang
   * 
   * EXAMPLE:
   * await indexer.shutdown();
   * process.exit(0);
   */
  async shutdown(): Promise<void> {
    await embedder.dispose();
    db.close();
    this.isInitialized = false;
    console.log('[Indexer] Shutdown complete');
  }
}

// Singleton instance - one indexer for the whole application
export const indexer = new Indexer();
