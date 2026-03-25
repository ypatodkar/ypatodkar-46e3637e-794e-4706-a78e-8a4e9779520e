#!/usr/bin/env node
/**
 * Updates display names for seeded demo users in the SQLite DB.
 * Keep EMAIL_TO_NAME in sync with apps/api/src/app/database/seed.service.ts (ensureUser profiles).
 *
 * Usage (from repo root):
 *   node scripts/update-demo-user-names.mjs
 *   DB_PATH=/path/to/db.sqlite node scripts/update-demo-user-names.mjs
 *   node scripts/update-demo-user-names.mjs --dry-run
 */

import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {readonly [string, string][]} */
const EMAIL_TO_NAME = [
  ['owner.acme@demo.local', 'Owner 1'],
  ['admin.acme@demo.local', 'Admin 1'],
  ['viewer.acme@demo.local', 'Viewer 1'],
  ['owner@demo.local', 'Owner 2'],
  ['admin@demo.local', 'Admin 2'],
  ['viewer@demo.local', 'Viewer 2'],
  ['owner.marketing@demo.local', 'Owner 3'],
  ['admin.marketing@demo.local', 'Admin 3'],
  ['viewer.marketing@demo.local', 'Viewer 3'],
];

const dryRun = process.argv.includes('--dry-run');

function resolveDbPath() {
  const raw = process.env.DB_PATH?.trim();
  if (raw) {
    return path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
  }
  return path.resolve(process.cwd(), 'data', 'taskmgmt.sqlite');
}

/**
 * @param {import('sqlite3').Database} db
 * @param {string} sql
 * @param {unknown[]} params
 */
function run(db, sql, params) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve(this.changes);
    });
  });
}

/**
 * @param {import('sqlite3').Database} db
 * @param {string} sql
 * @param {unknown[]} params
 */
function get(db, sql, params) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row);
    });
  });
}

async function main() {
  const dbPath = resolveDbPath();

  if (!fs.existsSync(dbPath)) {
    console.error(`Database file not found: ${dbPath}`);
    console.error('Set DB_PATH or create the DB by running the API once.');
    process.exit(1);
  }

  const db = await new Promise((resolve, reject) => {
    const d = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(d);
    });
  });

  try {
    const tableCheck = await get(
      db,
      `SELECT name FROM sqlite_master WHERE type='table' AND name='users'`,
      []
    );
    if (!tableCheck) {
      console.error('Table "users" not found. Is this the task management SQLite file?');
      process.exit(1);
    }

    let updated = 0;
    let missing = 0;

    for (const [email, name] of EMAIL_TO_NAME) {
      const key = email.trim().toLowerCase();
      const row = await get(
        db,
        `SELECT email, name FROM users WHERE lower(trim(email)) = ?`,
        [key]
      );
      if (!row) {
        console.warn(`No user row for email: ${email}`);
        missing += 1;
        continue;
      }
      if (row.name === name) {
        console.log(`OK (unchanged) ${email} → "${name}"`);
        continue;
      }
      console.log(
        dryRun
          ? `[dry-run] would set ${email}: "${row.name}" → "${name}"`
          : `Updating ${email}: "${row.name}" → "${name}"`
      );
      if (!dryRun) {
        const changes = await run(
          db,
          `UPDATE users SET name = ? WHERE lower(trim(email)) = ?`,
          [name, key]
        );
        updated += changes;
      }
    }

    if (dryRun) {
      console.log('\nDry run only; no writes performed.');
    } else {
      console.log(`\nDone. ${updated} row(s) updated. ${missing} email(s) not found in DB.`);
    }
  } finally {
    await new Promise((resolve, reject) => {
      db.close((err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(undefined);
      });
    });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
