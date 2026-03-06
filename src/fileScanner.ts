/**
 * =============================================================================
 * FILE SCANNER MODULE - Find and read source files
 * =============================================================================
 * 
 * This module handles discovering source files in a directory and reading
 * their contents. It also computes hashes for incremental indexing.
 * 
 * WHY DO WE NEED A FILE SCANNER?
 * ------------------------------
 * 1. We need to find ALL relevant source files (.js, .ts, .tsx)
 * 2. We need to skip irrelevant folders (node_modules, .git, etc.)
 * 3. We need to read file contents for parsing
 * 4. We need to compute hashes to detect changes
 * 
 * WHAT IS INCREMENTAL INDEXING?
 * ----------------------------
 * Instead of re-indexing ALL files every time, we:
 * 1. Compute MD5 hash of each file's content
 * 2. Compare with previously stored hash
 * 3. Only re-index files that have changed
 * 
 * This saves TONS of time on large codebases!
 * 
 * =============================================================================
 */

import * as fs from 'fs';
import * as path from 'path';
import md5 from 'md5';

/**
 * =============================================================================
 * INTERFACE - What a file looks like to us
 * =============================================================================
 */

export interface FileInfo {
  path: string;      // Full path to file
  content: string;  // File contents
  hash: string;      // MD5 hash of content
}

/**
 * =============================================================================
 * FILE SCANNER CLASS - Discovers and reads source files
 * =============================================================================
 */

export class FileScanner {
  // File extensions we care about - JavaScript and TypeScript
  private supportedExtensions: Set<string>;
  
  // Directories to skip - these don't contain source code we want to index
  private ignoredDirs: Set<string>;

  /**
   * =============================================================================
   * CONSTRUCTOR - Set up what to look for
   * =============================================================================
   * 
   * @sets
   * - .js: Plain JavaScript
   * - .ts: TypeScript
   * - .tsx: TypeScript React (JSX)
   * 
   * @ignores
   * - node_modules: npm packages (HUGE, not our code)
   * - .git: version control
   * - dist/build: compiled output
   * - coverage: test reports
   */
  constructor() {
    // These are the file types Tree-sitter can parse
    this.supportedExtensions = new Set(['.js', '.ts', '.tsx']);
    
    // Skip these folders - they don't contain our source code
    this.ignoredDirs = new Set(['node_modules', '.git', 'dist', 'build', 'coverage']);
  }

  /**
   * =============================================================================
   * SCAN - Find all source files in a directory tree
   * =============================================================================
   * 
   * Main entry point - call this to get a list of all relevant files.
   * 
   * @param rootDir - The directory to start scanning from
   * @returns Array of full paths to files that match our criteria
   * 
   * WHAT IT DOES:
   * 1. Starts at rootDir
   * 2. Recursively walks through all subdirectories
   * 3. Skips ignored directories
   * 4. Returns only files with supported extensions
   * 
   * EXAMPLE:
   * Input: "/Users/me/my-project"
   * Output: [
   *   "/Users/me/my-project/src/main.ts",
   *   "/Users/me/my-project/src/utils.ts",
   *   "/Users/me/my-project/src/App.tsx"
   * ]
   */
  async scan(rootDir: string): Promise<string[]> {
    const files: string[] = [];

    try {
      const absoluteRootDir = path.resolve(rootDir);
      await this.scanDirectory(absoluteRootDir, files);
    } catch (error) {
      console.error(`[FileScanner] Error scanning directory ${rootDir}:`, error);
    }

    return files;
  }

  /**
   * =============================================================================
   * SCAN DIRECTORY - Internal recursive scanner
   * =============================================================================
   * 
   * This is called recursively to walk the entire directory tree.
   * 
   * @param dir - Current directory to scan
   * @param files - Accumulator array to collect found files
   * 
   * ALGORITHM:
   * 1. Read all entries in current directory
   * 2. For each entry:
   *    - If it's a directory AND not in ignored list → recurse
   *    - If it's a file AND has supported extension → add to list
   */
  private async scanDirectory(dir: string, files: string[]): Promise<void> {
    let entries: fs.Dirent[];

    try {
      entries = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch (error) {
      console.warn(`[FileScanner] Cannot read directory ${dir}:`, error);
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (this.ignoredDirs.has(entry.name)) {
          continue;
        }
        await this.scanDirectory(fullPath, files);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        
        if (this.supportedExtensions.has(ext)) {
          files.push(fullPath);
        }
      }
    }
  }

  /**
   * =============================================================================
   * READ FILE - Load a file and compute its hash
   * =============================================================================
   * 
   * Reads the actual content of a file and generates a hash.
   * 
   * @param filePath - Path to the file to read
   * @returns FileInfo object with path, content, and hash, or null if error
   * 
   * WHY RETURN NULL ON ERROR?
   * - Some files might be unreadable (permissions, encoding issues)
   * - We don't want one bad file to crash the entire indexer
   * - We'll log the error and continue with other files
   * 
   * WHAT IS UTF-8?
   * - Character encoding for the file contents
   * - Standard for JavaScript/TypeScript source files
   * - Handles all modern characters and emoji
   */
  async readFile(filePath: string): Promise<FileInfo | null> {
    try {
      // Read file as text (UTF-8 encoding)
      const content = await fs.promises.readFile(filePath, 'utf-8');
      
      // Compute MD5 hash of the content
      const hash = this.computeHash(content);
      
      // Return all the info we need
      return { path: filePath, content, hash };
    } catch (error) {
      // Log the error but don't crash
      console.error(`[FileScanner] Error reading file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * =============================================================================
   * COMPUTE HASH - Generate MD5 hash of content
   * =============================================================================
   * 
   * MD5 produces a 128-bit (32 hex character) hash from any input.
   * 
   * WHY MD5?
   * - Fast to compute
   * - Good enough for change detection (we don't need crypto security)
   * - Works great for "did the file change?" questions
   * 
   * @param content - The text to hash
   * @returns 32-character hex string (the hash)
   * 
   * IMPORTANT:
   * - Same content → same hash (deterministic)
   * - Different content → almost certainly different hash
   * - Tiny change (one character) → completely different hash
   * 
   * EXAMPLE:
   * "hello" → "5d41402abc4b2a76b9719d911017c592"
   * "hello!" → "33e0d8d1c60c9f7b5d7e9c1a2f3b4c5d"
   */
  private computeHash(content: string): string {
    // Using the md5 library (same as PHP's md5())
    return md5(content);
  }

  /**
   * =============================================================================
   * FILTER CHANGED FILES - Find files that need re-indexing
   * =============================================================================
   * 
   * Compares current file hashes with previously stored hashes
   * to determine which files have actually changed.
   * 
   * @param files - Array of current FileInfo objects
   * @param existingHashes - Map of file path → previously stored hash
   * @returns Only the files that are new or have changed
   * 
   * LOGIC:
   * For each file:
   * - If path not in existingHashes → file is NEW → include it
   * - If hash differs from existingHash → file CHANGED → include it
   * - If hash matches existingHash → file UNCHANGED → skip it
   * 
   * WHY IS THIS IMPORTANT?
   * - Large projects have thousands of files
   * - Only a few files change between runs
   * - This saves enormous amounts of time!
   * 
   * EXAMPLE:
   * files: [A.js, B.ts, C.tsx]
   * existingHashes: {A.js: "abc", B.ts: "def"}
   * 
   * Result:
   * - A.js: hash "abc" matches → unchanged → SKIP
   * - B.ts: hash "xyz" differs → changed → INCLUDE
   * - C.tsx: not in map → new → INCLUDE
   */
  filterChangedFiles(files: FileInfo[], existingHashes: Map<string, string>): FileInfo[] {
    return files.filter((file) => {
      // Get the stored hash for this file (if any)
      const existingHash = existingHashes.get(file.path);
      
      // Include if: no previous hash OR hash is different
      return !existingHash || existingHash !== file.hash;
    });
  }
}
