const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const logger = require('./logger');

const SCAN_MODE = String(process.env.FINANCE_VIRUS_SCAN_MODE || 'best_effort')
  .trim()
  .toLowerCase();
const SCAN_TIMEOUT_MS = Math.min(
  Math.max(Number(process.env.FINANCE_VIRUS_SCAN_TIMEOUT_MS) || 20000, 1000),
  120000
);
const SCANNER_COMMAND = String(process.env.FINANCE_VIRUS_SCAN_COMMAND || 'clamscan').trim();
const SCANNER_ARGS = String(process.env.FINANCE_VIRUS_SCAN_ARGS || '--no-summary')
  .split(' ')
  .map((value) => value.trim())
  .filter(Boolean);

const runScanner = (filePath) =>
  new Promise((resolve, reject) => {
    const args = [...SCANNER_ARGS, filePath];
    const child = spawn(SCANNER_COMMAND, args, { shell: false, windowsHide: true });
    let stdout = '';
    let stderr = '';
    let settled = false;

    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill('SIGKILL');
      reject(new Error('scan-timeout'));
    }, SCAN_TIMEOUT_MS);

    child.stdout.on('data', (chunk) => {
      stdout += String(chunk || '');
    });

    child.stderr.on('data', (chunk) => {
      stderr += String(chunk || '');
    });

    child.on('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(error);
    });

    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve({
        code: Number(code),
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      });
    });
  });

async function scanFile(filePath) {
  try {
    if (!filePath || !fs.existsSync(filePath)) {
      throw new Error('file-not-found');
    }

    const stats = fs.statSync(filePath);
    // Quick heuristic: reject zero-byte files
    if (stats.size === 0) {
      throw new Error('empty-file');
    }

    if (SCAN_MODE === 'off') {
      logger.warn(`[finance-security] virus scan disabled for ${path.basename(filePath)}`);
      return true;
    }

    const result = await runScanner(filePath).catch((error) => {
      if (SCAN_MODE === 'strict') {
        throw error;
      }
      logger.warn(`[finance-security] scanner unavailable (${error.message}); allowing file in best_effort mode`);
      return null;
    });

    if (!result) {
      return true;
    }

    if (result.code === 0) {
      logger.info(`[finance-security] virus scan passed for ${path.basename(filePath)}`);
      return true;
    }

    if (result.code === 1) {
      throw new Error('infected-file');
    }

    if (SCAN_MODE === 'strict') {
      throw new Error(`scan-failed:${result.code}`);
    }

    logger.warn(
      `[finance-security] scanner returned code ${result.code} for ${path.basename(filePath)}; allowing in best_effort mode`
    );
    if (result.stderr) {
      logger.warn(`[finance-security] scanner stderr: ${result.stderr.slice(0, 400)}`);
    }
    return true;
  } catch (error) {
    logger.error(`virusScan error: ${error?.message || error}`);
    throw error;
  }
}

module.exports = { scanFile };
