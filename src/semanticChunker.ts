/**
 * =============================================================================
 * SEMANTIC CHUNKER MODULE - Parse code into logical units using Tree-sitter
 * =============================================================================
 * 
 * This module uses Tree-sitter to analyze source code and extract meaningful
 * chunks (functions, classes, exports) instead of arbitrary line splits.
 * 
 * WHAT IS TREE-SITTER?
 * --------------------
 * Tree-sitter is a parser generator tool that builds Abstract Syntax Trees (AST).
 * Think of it as a super-smart syntax highlighter that understands code structure.
 * 
 * WHY NOT JUST SPLIT BY LINES?
 * ----------------------------
 * Imagine you have this code:
 * 
 *   function add(a, b) {    // lines 1-3
 *     return a + b;
 *   }
 * 
 * If we split by lines, we might get:
 *   Chunk 1: "function add(a, b) {"
 *   Chunk 2: "  return a + b;"
 *   Chunk 3: "}"
 * 
 * These chunks don't make sense on their own!
 * 
 * With Tree-sitter, we get the FULL function as one chunk:
 *   Chunk 1: "function add(a, b) { return a + b; }"
 * 
 * This is MUCH better for:
 * 1. Understanding context (full function, not fragment)
 * 2. Embeddings (meaning is preserved)
 * 3. Search results (get complete functions)
 * 
 * WHAT IS AN AST?
 * ---------------
 * AST = Abstract Syntax Tree
 * 
 * It's a tree representation of your code where:
 * - Each node = a piece of code (function, variable, operator)
 * - The hierarchy shows how code is nested
 * 
 * Example for "function add(a, b) { return a + b; }":
 * 
 *   function_declaration
 *   ├── identifier (add)
 *   ├── parameters
 *   │   ├── identifier (a)
 *   │   └── identifier (b)
 *   └── block
 *       └── return_statement
 *           └── binary_expression
 *               ├── identifier (a)
 *               └── identifier (b)
 * 
 * =============================================================================
 */

import Parser from 'tree-sitter';
import JavaScript from 'tree-sitter-javascript';
import TypeScript from 'tree-sitter-typescript';

/**
 * =============================================================================
 * INTERFACE - What a code chunk looks like
 * =============================================================================
 */

export interface Chunk {
  text: string;      // The actual code text
  startLine: number; // Which line does it start on?
  endLine: number;   // Which line does it end on?
  type: string;      // What kind of code is this? (function, class, etc.)
}

/**
 * =============================================================================
 * SEMANTIC CHUNKER CLASS - Extract logical code units
 * =============================================================================
 */

export class SemanticChunker {
  private initialized: boolean = false;

  /**
   * =============================================================================
   * CONSTRUCTOR - Initialize the chunker
   * =============================================================================
   */
  constructor() {
    this.initialized = true;
  }

  /**
   * =============================================================================
   * CREATE PARSER - Create a fresh parser instance for a file
   * =============================================================================
   * 
   * We create FRESH parser instances for each file to avoid state issues.
   * Reusing parsers across files can cause "Invalid argument" errors.
   * 
   * @param filePath - Path to determine which language parser to use
   * @returns A new parser instance configured for the file type
   */
  private createParser(filePath: string): Parser {
    const parser = new Parser();
    const ext = filePath.toLowerCase();
    
    if (ext.endsWith('.ts') || ext.endsWith('.tsx')) {
      parser.setLanguage(TypeScript.tsx as any);
    } else {
      parser.setLanguage(JavaScript as any);
    }
    
    return parser;
  }

  /**
   * =============================================================================
   * CHUNK - Main function to extract semantic units
   * =============================================================================
   * 
   * This is the MAIN function that converts raw code into chunks!
   * 
   * @param filePath - Path to determine which parser to use
   * @param sourceCode - The actual code text to parse
   * @returns Array of Chunk objects (functions, classes, exports, etc.)
   * 
   * WHAT IT DOES:
   * 1. Parse the code into an AST (Abstract Syntax Tree)
   * 2. Walk through the tree looking for important nodes
   * 3. Extract matching nodes as chunks
   * 
   * NODE TYPES WE EXTRACT:
   * ---------------------
   * - function_declaration: "function foo() {}"
   * - function_expression: "const foo = function() {}"
   * - arrow_function: "const foo = () => {}"
   * - method_definition: "class Foo { bar() {} }"
   * - class_declaration: "class Foo {}"
   * - class_expression: "const Foo = class {}"
   * - export_statement: "export function foo() {}"
   * - export_clause: "export { foo, bar }"
   * - lexical_declaration: "const/let x = ..."
   * - variable_declaration: "var x = ..." (older JS)
   * 
   * WHY THESE SPECIFIC TYPES?
   * - They represent COMPLETE, MEANINGFUL units
   * - You can understand each chunk on its own
   * - Makes for better embeddings and search results
   */
  chunk(filePath: string, sourceCode: string): Chunk[] {
    // Step 1: Validate input
    if (!sourceCode || sourceCode.trim().length === 0) {
      return [];
    }

    // Step 2: Create a fresh parser for this file
    const parser = this.createParser(filePath);

    // Step 3: Parse the code → produces an AST (tree structure)
    const tree = parser.parse(sourceCode);

    const chunks: Chunk[] = [];

    // Step 4: Define which node types we care about
    // These are "logical units" - complete pieces of code
    const nodeTypes = [
      'function_declaration',      // function add() {}
      'function_expression',       // const add = function() {}
      'arrow_function',            // const add = () => {}
      'method_definition',         // class Foo { bar() {} }
      'class_declaration',         // class Foo {}
      'class_expression',          // const Foo = class {}
      'export_statement',          // export function foo() {}
      'export_clause',             // export { foo, bar }
      'lexical_declaration',       // const/let x = ...
      'variable_declaration',      // var x = ...
    ];

    // Step 5: Walk the tree and extract matching nodes
    this.walkTree(tree.rootNode, sourceCode, nodeTypes, chunks);

    return chunks;
  }

  /**
   * =============================================================================
   * WALK TREE - Recursively traverse the AST
   * =============================================================================
   * 
   * This is a DEPTH-FIRST traversal of the AST.
   * 
   * @param node - Current node in the AST
   * @param sourceCode - Original code (for extracting text)
   * @param targetTypes - Which node types we want to capture
   * @param chunks - Accumulator array for found chunks
   * 
   * HOW IT WORKS:
   * 1. Start at root node
   * 2. Check if current node matches our target types
   * 3. If yes, add to chunks array
   * 4. Recursively process all children
   * 
   * TREE STRUCTURE EXAMPLE:
   * 
   * program
   *   ├── function_declaration  ← MATCH! Add to chunks
   *   │   ├── identifier
   *   │   ├── parameters
   *   │   └── block
   *   ├── comment               ← Skip (not in targetTypes)
   *   └── class_declaration     ← MATCH! Add to chunks
   *       ├── identifier
   *       └── class_body
   *           └── method_definition  ← MATCH! Add to chunks
   * 
   * WHY ROW + 1?
   * - Tree-sitter uses 0-based indexing (first line = 0)
   * - Humans use 1-based (first line = 1)
   * - Add 1 to convert for human-readable line numbers
   */
  private walkTree(
    node: Parser.SyntaxNode,
    sourceCode: string,
    targetTypes: string[],
    chunks: Chunk[]
  ): void {
    // Safety check - some nodes might be null
    if (!node) return;

    const type = node.type;

    // Check if this node is one we want to capture
    if (targetTypes.includes(type)) {
      // Get the text content of this node (the actual code)
      const text = node.text;
      
      // Get line numbers (convert from 0-based to 1-based)
      const startLine = node.startPosition.row + 1;
      const endLine = node.endPosition.row + 1;

      // Only add non-empty chunks (skip whitespace-only nodes)
      if (text && text.trim().length > 0) {
        chunks.push({
          text: text,
          startLine: startLine,
          endLine: endLine,
          type: type,
        });
      }
    }

    // RECURSION: Process all child nodes
    // This is depth-first traversal
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child) {
        this.walkTree(child, sourceCode, targetTypes, chunks);
      }
    }
  }
}
