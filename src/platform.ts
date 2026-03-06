/**
 * =============================================================================
 * PLATFORM MODULE - Cross-platform compatibility utilities
 * =============================================================================
 *
 * This module handles platform detection and provides paths to platform-specific
 * resources like native extensions.
 *
 * SUPPORTED PLATFORMS:
 * - macOS (darwin) on ARM64 (Apple Silicon) and x64 (Intel)
 * - Linux on ARM64 and x64
 * - Windows on x64
 *
 * =============================================================================
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Platform information interface
 */
export interface PlatformInfo {
  os: string;      // 'darwin', 'linux', 'win32'
  arch: string;    // 'arm64', 'x64'
  platform: string; // Combined platform-arch string
}

/**
 * Get current platform information
 *
 * @returns PlatformInfo object with os, arch, and platform
 */
export function getPlatformInfo(): PlatformInfo {
  const platform = os.platform();
  const arch = os.arch();

  return {
    os: platform,
    arch: arch,
    platform: `${platform}-${arch}`,
  };
}

/**
 * Check if current platform is supported
 *
 * @returns true if platform is supported, false otherwise
 */
export function isPlatformSupported(): boolean {
  const { platform } = getPlatformInfo();
  const supportedPlatforms = [
    'darwin-arm64',
    'darwin-x64',
    'linux-arm64',
    'linux-x64',
    'win32-x64',
  ];
  return supportedPlatforms.includes(platform);
}

/**
 * Get the sqlite-vec extension path for the current platform
 *
 * This function detects the current OS and architecture, then returns
 * the appropriate path to the sqlite-vec native extension.
 *
 * @returns Absolute path to the sqlite-vec extension file
 * @throws Error if the platform is not supported
 */
export function getSqliteVecExtensionPath(): string {
  const { os, arch } = getPlatformInfo();

  // Map platform/arch to extension filename
  const extensionMap: Record<string, string> = {
    'darwin-arm64': 'vec0.dylib',
    'darwin-x64': 'vec0.dylib',
    'linux-arm64': 'vec0.so',
    'linux-x64': 'vec0.so',
    'win32-x64': 'vec0.dll',
  };

  const platform = `${os}-${arch}`;
  const extensionFile = extensionMap[platform];

  if (!extensionFile) {
    throw new Error(
      `Unsupported platform: ${platform}. ` +
      `Supported platforms: ${Object.keys(extensionMap).join(', ')}`
    );
  }

  // Build the package name
  const packageName = `sqlite-vec-${platform}`;

  // Try multiple possible locations
  const possiblePaths = [
    // Installed as dependency in production
    path.join(__dirname, '../node_modules', packageName, extensionFile),
    // Installed at root (development)
    path.join(process.cwd(), 'node_modules', packageName, extensionFile),
    // Global installation
    path.join(__dirname, '../../..', packageName, extensionFile),
  ];

  // Find the first path that exists
  for (const extPath of possiblePaths) {
    if (fs.existsSync(extPath)) {
      return extPath;
    }
  }

  // If no path found, return the first one and let it fail with a clear error
  console.warn(`[Platform] Warning: sqlite-vec extension not found at expected locations. Trying: ${possiblePaths[0]}`);
  return possiblePaths[0];
}

/**
 * Normalize path for current platform
 *
 * - Windows: converts forward slashes to backslashes
 * - Unix: keeps as-is
 *
 * @param p - Path to normalize
 * @returns Normalized path
 */
export function normalizePath(p: string): string {
  if (os.platform() === 'win32') {
    return p.replace(/\//g, '\\');
  }
  return p;
}

/**
 * Check if running on Windows
 *
 * @returns true if on Windows
 */
export function isWindows(): boolean {
  return os.platform() === 'win32';
}

/**
 * Check if running on macOS
 *
 * @returns true if on macOS
 */
export function isMacOS(): boolean {
  return os.platform() === 'darwin';
}

/**
 * Check if running on Linux
 *
 * @returns true if on Linux
 */
export function isLinux(): boolean {
  return os.platform() === 'linux';
}
