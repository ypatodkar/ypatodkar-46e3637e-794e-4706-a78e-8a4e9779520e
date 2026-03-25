#!/usr/bin/env node
/**
 * Inserts additional mock tasks into the SQLite DB (same shape as TypeORM / seed).
 * Resolves organizations (Acme Corp, Engineering, Marketing) and demo users by email.
 *
 * Usage (repo root):
 *   node scripts/seed-mock-tasks.mjs
 *   node scripts/seed-mock-tasks.mjs --dry-run
 *   DB_PATH=/path/to/db.sqlite node scripts/seed-mock-tasks.mjs
 */

import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dryRun = process.argv.includes('--dry-run');

/** Demo accounts — keep aligned with apps/api/src/app/database/seed.service.ts */
const DEMO_EMAILS = {
  acmeOwner: 'owner.acme@demo.local',
  acmeAdmin: 'admin.acme@demo.local',
  acmeViewer: 'viewer.acme@demo.local',
  engOwner: 'owner@demo.local',
  engAdmin: 'admin@demo.local',
  engViewer: 'viewer@demo.local',
  mktOwner: 'owner.marketing@demo.local',
  mktAdmin: 'admin.marketing@demo.local',
  mktViewer: 'viewer.marketing@demo.local',
};

/**
 * @typedef {Object} MockTaskSpec
 * @property {'acme' | 'engineering' | 'marketing'} org
 * @property {keyof typeof DEMO_EMAILS} creatorKey
 * @property {keyof typeof DEMO_EMAILS | null} [assigneeKey]
 * @property {string} title
 * @property {string | null} [description]
 * @property {string} category
 * @property {string} priority
 * @property {string} status
 * @property {string | null} [dueDate] ISO datetime or null
 */

/** @type {readonly MockTaskSpec[]} */
const MOCK_TASKS = [
  {
    org: 'acme',
    creatorKey: 'acmeAdmin',
    assigneeKey: 'acmeViewer',
    title: 'Quarterly access review',
    description: 'Review SSO groups and dormant accounts.',
    category: 'MAINTENANCE',
    priority: 'HIGH',
    status: 'OPEN',
    dueDate: '2026-04-01T12:00:00.000Z',
  },
  {
    org: 'acme',
    creatorKey: 'acmeOwner',
    assigneeKey: 'acmeAdmin',
    title: 'Board slide: security posture',
    description: null,
    category: 'RESEARCH',
    priority: 'MEDIUM',
    status: 'IN_PROGRESS',
    dueDate: null,
  },
  {
    org: 'acme',
    creatorKey: 'acmeAdmin',
    assigneeKey: null,
    title: 'Evaluate new SIEM vendor',
    description: 'Shortlist 3 vendors; schedule demos.',
    category: 'RESEARCH',
    priority: 'LOW',
    status: 'OPEN',
    dueDate: '2026-05-10T12:00:00.000Z',
  },
  {
    org: 'acme',
    creatorKey: 'acmeViewer',
    assigneeKey: 'acmeViewer',
    title: 'Update org chart in wiki',
    category: 'IMPROVEMENT',
    priority: 'LOW',
    status: 'DONE',
    dueDate: null,
  },
  {
    org: 'engineering',
    creatorKey: 'engAdmin',
    assigneeKey: 'engViewer',
    title: 'Harden JWT refresh flow',
    description: 'Rotate secrets; shorten TTL for viewers.',
    category: 'FEATURE',
    priority: 'HIGH',
    status: 'OPEN',
    dueDate: '2026-03-30T12:00:00.000Z',
  },
  {
    org: 'engineering',
    creatorKey: 'engOwner',
    assigneeKey: 'engAdmin',
    title: 'Postmortem: API latency spike',
    category: 'MAINTENANCE',
    priority: 'MEDIUM',
    status: 'IN_PROGRESS',
    dueDate: null,
  },
  {
    org: 'engineering',
    creatorKey: 'engAdmin',
    assigneeKey: 'engViewer',
    title: 'Flaky e2e: login spec',
    category: 'BUG',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    dueDate: null,
  },
  {
    org: 'engineering',
    creatorKey: 'engViewer',
    assigneeKey: 'engAdmin',
    title: 'Document local dev setup',
    category: 'MAINTENANCE',
    priority: 'LOW',
    status: 'OPEN',
    dueDate: null,
  },
  {
    org: 'engineering',
    creatorKey: 'engAdmin',
    assigneeKey: 'engOwner',
    title: 'Release checklist v2',
    category: 'IMPROVEMENT',
    priority: 'MEDIUM',
    status: 'DONE',
    dueDate: null,
  },
  {
    org: 'engineering',
    creatorKey: 'engOwner',
    assigneeKey: 'engAdmin',
    title: 'Archive deprecated mobile API',
    category: 'MAINTENANCE',
    priority: 'LOW',
    status: 'VERIFIED',
    dueDate: null,
  },
  {
    org: 'marketing',
    creatorKey: 'mktAdmin',
    assigneeKey: 'mktViewer',
    title: 'Product launch landing page',
    description: 'Hero, pricing table, FAQ.',
    category: 'FEATURE',
    priority: 'HIGH',
    status: 'OPEN',
    dueDate: '2026-04-20T12:00:00.000Z',
  },
  {
    org: 'marketing',
    creatorKey: 'mktOwner',
    assigneeKey: 'mktAdmin',
    title: 'Competitor messaging matrix',
    category: 'RESEARCH',
    priority: 'MEDIUM',
    status: 'IN_PROGRESS',
    dueDate: null,
  },
  {
    org: 'marketing',
    creatorKey: 'mktAdmin',
    assigneeKey: 'mktViewer',
    title: 'Fix broken UTM on signup form',
    category: 'BUG',
    priority: 'HIGH',
    status: 'OPEN',
    dueDate: null,
  },
  {
    org: 'marketing',
    creatorKey: 'mktViewer',
    assigneeKey: 'mktAdmin',
    title: 'Refresh email template assets',
    category: 'IMPROVEMENT',
    priority: 'LOW',
    status: 'IN_PROGRESS',
    dueDate: null,
  },
  {
    org: 'marketing',
    creatorKey: 'mktOwner',
    assigneeKey: 'mktViewer',
    title: 'Q1 webinar recap blog',
    category: 'FEATURE',
    priority: 'MEDIUM',
    status: 'DONE',
    dueDate: null,
  },
  {
    org: 'marketing',
    creatorKey: 'mktAdmin',
    assigneeKey: 'mktViewer',
    title: 'GDPR footer copy audit',
    category: 'MAINTENANCE',
    priority: 'MEDIUM',
    status: 'VERIFIED',
    dueDate: null,
  },
];

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

/**
 * @param {import('sqlite3').Database} db
 * @returns {Promise<{ acme: string, engineering: string, marketing: string }>}
 */
async function loadOrgIds(db) {
  const acme = await get(
    db,
    `SELECT id FROM organizations WHERE name = 'Acme Corp' AND parent_organization_id IS NULL`,
    []
  );
  const engineering = await get(
    db,
    `SELECT o.id AS id FROM organizations o
     INNER JOIN organizations p ON o.parent_organization_id = p.id
     WHERE o.name = 'Engineering' AND p.name = 'Acme Corp'`,
    []
  );
  const marketing = await get(
    db,
    `SELECT o.id AS id FROM organizations o
     INNER JOIN organizations p ON o.parent_organization_id = p.id
     WHERE o.name = 'Marketing' AND p.name = 'Acme Corp'`,
    []
  );
  if (!acme?.id || !engineering?.id || !marketing?.id) {
    throw new Error(
      'Could not resolve Acme Corp / Engineering / Marketing organizations. Run the API seed first.'
    );
  }
  return {
    acme: acme.id,
    engineering: engineering.id,
    marketing: marketing.id,
  };
}

/**
 * @param {import('sqlite3').Database} db
 * @returns {Promise<Map<string, { id: string, organizationId: string }>>}
 */
async function loadUsersByEmail(db) {
  const rows = await new Promise((resolve, reject) => {
    db.all(`SELECT id, email, organizationId FROM users`, [], (err, r) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(r);
    });
  });
  /** @type {Map<string, { id: string, organizationId: string }>} */
  const map = new Map();
  for (const row of rows) {
    map.set(String(row.email).trim().toLowerCase(), {
      id: row.id,
      organizationId: row.organizationId,
    });
  }
  return map;
}

/**
 * @param {import('sqlite3').Database} db
 * @param {string} organizationId
 * @param {string} status
 */
async function nextSortOrder(db, organizationId, status) {
  const row = await get(
    db,
    `SELECT COALESCE(MAX("sortOrder"), -1) + 1 AS n FROM tasks
     WHERE "organizationId" = ? AND status = ? AND ("deletedAt" IS NULL)`,
    [organizationId, status]
  );
  return row?.n ?? 0;
}

async function main() {
  const dbPath = resolveDbPath();

  if (!fs.existsSync(dbPath)) {
    console.error(`Database file not found: ${dbPath}`);
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
    const orgIds = await loadOrgIds(db);
    const usersByEmail = await loadUsersByEmail(db);

    const orgKeyToId = {
      acme: orgIds.acme,
      engineering: orgIds.engineering,
      marketing: orgIds.marketing,
    };

    let inserted = 0;

    for (const spec of MOCK_TASKS) {
      const orgId = orgKeyToId[spec.org];
      const creatorEmail = DEMO_EMAILS[spec.creatorKey].toLowerCase();
      const creator = usersByEmail.get(creatorEmail);
      if (!creator) {
        throw new Error(`Missing user for email: ${creatorEmail}`);
      }
      if (creator.organizationId !== orgId) {
        throw new Error(
          `User ${creatorEmail} org mismatch for task "${spec.title}" (expected org ${orgId}, user has ${creator.organizationId})`
        );
      }

      let assigneeId = null;
      if (spec.assigneeKey) {
        const assigneeEmail = DEMO_EMAILS[spec.assigneeKey].toLowerCase();
        const assignee = usersByEmail.get(assigneeEmail);
        if (!assignee) {
          throw new Error(`Missing assignee user for email: ${assigneeEmail}`);
        }
        if (assignee.organizationId !== orgId) {
          throw new Error(
            `Assignee ${assigneeEmail} is not in the same org as task "${spec.title}"`
          );
        }
        assigneeId = assignee.id;
      }

      const sortOrder = await nextSortOrder(db, orgId, spec.status);
      const id = randomUUID();

      const insertSql = `INSERT INTO tasks (
        id, title, description, status, priority, category, dueDate, sortOrder,
        creatorId, assigneeId, organizationId, createdAt, updatedAt, deletedAt,
        creator_id, assignee_id, organization_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), NULL, NULL, NULL, NULL)`;

      const params = [
        id,
        spec.title,
        spec.description ?? null,
        spec.status,
        spec.priority,
        spec.category,
        spec.dueDate ?? null,
        sortOrder,
        creator.id,
        assigneeId,
        orgId,
      ];

      if (dryRun) {
        console.log(
          `[dry-run] ${spec.org} | ${spec.status} | ${spec.title} | creator=${creatorEmail} | assignee=${spec.assigneeKey ?? '—'} | sortOrder=${sortOrder}`
        );
      } else {
        await run(db, insertSql, params);
        inserted += 1;
        console.log(`Inserted: ${spec.title} (${spec.org}, ${spec.status})`);
      }
    }

    if (dryRun) {
      console.log(`\nDry run: would insert ${MOCK_TASKS.length} task(s).`);
    } else {
      console.log(`\nDone. Inserted ${inserted} task(s).`);
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
