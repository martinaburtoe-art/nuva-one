import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
const entries = await readdir(migrationsDir, { withFileTypes: true });
const sqlFiles = entries.filter((entry) => entry.isFile() && entry.name.endsWith('.sql'));

const timestampPattern = /^(\d{14})_[^/]+\.sql$/;
const seen = new Map();
const invalid = [];

for (const entry of sqlFiles) {
  const match = entry.name.match(timestampPattern);
  if (!match) {
    invalid.push(entry.name);
    continue;
  }

  const [, timestamp] = match;
  const previous = seen.get(timestamp);
  if (previous) {
    throw new Error(
      `Duplicate Supabase migration version ${timestamp}: ${previous} and ${entry.name}`,
    );
  }
  seen.set(timestamp, entry.name);
}

if (invalid.length > 0) {
  throw new Error(
    `Invalid Supabase migration filenames (expected YYYYMMDDHHMMSS_name.sql):\n${invalid.join('\n')}`,
  );
}

console.log(`Migration integrity OK: ${sqlFiles.length} SQL migrations, ${seen.size} unique versions.`);
