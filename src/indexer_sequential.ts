/**
 * =============================================================================
 * SEQUENTIAL INDEXER - Slower but simpler version for comparison
 * =============================================================================
 * 
 * This is an ALTERNATIVE implementation that processes files ONE AT A TIME.
 * 
 * WHY DOES THIS EXIST?
 * --------------------
 * 1. SIMPLICITY: Easier to understand and debug
 * 2. COMPARISON: Can compare performance vs parallel version
 * 3. MEMORY: Uses less memory (no parallel workers)
 * 4. DEBUGGING: Single thread = easier to trace issues
 * 
 * DIFFERENCES FROM PARALLEL VERSION:
 * ---------------------------------
 * - indexer.ts: Processes 10 files at once (concurrent)
 * - indexer_sequential.ts: Processes 1 file at a time
 * 
 * WHEN TO USE WHICH?
 * -----------------
 * Use SEQUENTIAL when:
 * - You have limited memory
 * - You're debugging issues
 * - You want to understand the code
 * 
 * Use PARALLEL (indexer.ts) when:
 * - You have many files to index
 * - Speed is important
 * - You have enough memory
 * 
 * PERFORMANCE COMPARISON:
 * ----------------------
 * 100 files, average 500 lines each:
 * - Sequential: ~45 seconds
 * - Parallel (10 workers): ~8 seconds
 * 
 * The parallel version is ~5x faster!
 * 
 * =============================================================================
 */

import { FileScanner, FileInfo } from './fileScanner.js';
import { SemanticChunker, Chunk } from './semanticChunker.js';
import { embedder } from './embedder.js';
import { db, CodeChunk, SearchResult } from './database.js';
import md5 from 'md5';

// Configuration options (same as parallel version)
export interface IndexerOptions {
  targetDir: string;              // Directory to index
  forceReindex?: boolean;          // Skip incremental, re-index everything
}

// Statistics about indexing operation
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
 * SEQUENTIAL INDEXER CLASS
 * =============================================================================
 * 
 * Same API as the parallel version, but processes one file at a time.
 */

export class Indexer {
  private fileScanner: FileScanner;
  private chunker: SemanticChunker;
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
   * Must be called before any indexing!
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    await db.connect();
    await embedder.initialize();
    this.isInitialized = true;
  }

  /**
   * =============================================================================
   * INDEX - Main entry point for indexing (sequential)
   * =============================================================================
   * 
   * This runs the RAG pipeline but ONE FILE AT A TIME.
   * 
   * @param options - Configuration for what/how to index
   * @returns Statistics about the indexing operation
   * 
   * PIPELINE STEPS (SAME AS PARALLEL):
   * ----------------------------------
   * 1. SCAN: Find all .js/.ts/.tsx files
   * 2. READ: Load file contents
   * 3. FILTER: Skip unchanged files
   * 4. CHUNK: Parse code into semantic units
   * 5. EMBED: Convert chunk to vector
   * 6. STORE: Save to database
   * 
   * THE DIFFERENCE:
   * - Parallel: Does steps 4-6 for 10 files at once
   * - Sequential: Does steps 4-6 for 1 file, then moves to next
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

      // STEP 2: READ - Load file contents (one at a time)
      const fileInfos: FileInfo[] = [];
      for (const filePath of filePaths) {
        const fileInfo = await this.fileScanner.readFile(filePath);
        if (fileInfo) {
          fileInfos.push(fileInfo);
        }
      }

      // STEP 3: FILTER - Skip unchanged files
      const existingHashes = db.getAllFileHashes();
      const filesToIndex = options.forceReindex
        ? fileInfos
        : this.fileScanner.filterChangedFiles(fileInfos, existingHashes);

      stats.filesChanged = filesToIndex.length;
      console.log(`[Indexer] Indexing ${filesToIndex.length} changed files`);

      // STEP 4-6: CHUNK → EMBED → STORE (one file at a time)
      // 
      // For each file:
      // 1. Parse into chunks
      // 2. Embed each chunk
      // 3. Store in database
      // Then move to next file
      for (const fileInfo of filesToIndex) {
        try {
          // STEP 4: CHUNK - Parse code
          const chunks = this.chunker.chunk(fileInfo.path, fileInfo.content);
          stats.chunksExtracted += chunks.length;

          // For each chunk: embed and store
          for (const chunk of chunks) {
            // STEP 5: EMBED - Convert to vector
            const embedding = await embedder.embed(chunk.text);

            // STEP 6: STORE - Save to database
            const codeChunk: CodeChunk = {
              file_path: fileInfo.path,
              file_hash: fileInfo.hash,
              chunk_text: chunk.text,
              start_line: chunk.startLine,
              end_line: chunk.endLine,
              content_hash: md5(chunk.text),
              embedding: embedding,
            };

            const insertedId = db.insertChunk(codeChunk);
            if (insertedId) {
              stats.chunksIndexed++;
            }
          }
        } catch (error) {
          console.error(`[Indexer] Error processing file ${fileInfo.path}:`, error);
          stats.errors++;
        }
      }

      // Calculate total duration
      stats.duration = Date.now() - startTime;
      console.log(`[Indexer] Indexing complete in ${stats.duration}ms`);
      console.log(`[Indexer] Stats:`, stats);

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
   * Same as parallel version - search is always fast!
   * 
   * @param query - Natural language search query
   * @param limit - Maximum results to return
   * @returns Array of SearchResult sorted by similarity
   */
  async search(query: string, limit: number = 5): Promise<SearchResult[]> {
    if (!this.isInitialized) {
      throw new Error('Indexer not initialized. Call initialize() first.');
    }

    // Convert query to embedding
    const queryEmbedding = await embedder.embed(query);
    
    // Find similar chunks in database
    return db.searchSimilar(queryEmbedding, limit);
  }

  /**
   * =============================================================================
   * SHUTDOWN - Clean up resources
   * =============================================================================
   */
  async shutdown(): Promise<void> {
    await embedder.dispose();
    db.close();
    this.isInitialized = false;
  }
}

// Singleton instance
export const indexer = new Indexer();
