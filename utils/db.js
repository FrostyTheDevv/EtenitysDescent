// src/utils/db.js

import path from 'path';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import fs from 'fs';

/**
 * db.js
 *
 * Centralizes SQLite database access and migration logic.
 * Exports a `getDb()` function to get a ready-to-use connection,
 * and an `initDb()` function to run all SQL migrations from a folder.
 */

const DB_PATH = process.env.DB_PATH || path.resolve('data/game.db');
const MIGRATIONS_DIR = path.resolve('src/services/data/migrations');

/**
 * Opens a SQLite database connection with foreign keys enabled.
 * @returns {Promise<import('sqlite').Database>}
 */
export async function getDb() {
  const db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database,
  });
  // Enable foreign key support
  await db.exec('PRAGMA foreign_keys = ON');
  return db;
}

/**
 * Runs all migrations found in MIGRATIONS_DIR in filename order.
 * Each migration file should contain valid SQL statements.
 */
export async function initDb() {
  const db = await getDb();

  try {
    // Ensure the migrations directory exists
    if (!fs.existsSync(MIGRATIONS_DIR)) {
      console.warn(`Migrations directory not found: ${MIGRATIONS_DIR}`);
      return;
    }

    // Read and sort migration files (001_*.sql, 002_*.sql, ...)
    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const filePath = path.join(MIGRATIONS_DIR, file);
      const sql = fs.readFileSync(filePath, 'utf-8');
      console.log(`Running migration: ${file}`);
      await db.exec(sql);
    }

    console.log('All migrations applied successfully.');
  } catch (err) {
    console.error('Error applying migrations:', err);
    throw err;
  } finally {
    await db.close();
  }
}