import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const VERSION_PATTERN = /^\d{14}$/;
const LOCAL_FILENAME_PATTERN = /^(\d{14})_(.+)\.sql$/i;

export function normalizeMigrationName(value) {
  return String(value ?? '')
    .trim()
    .replace(/\.sql$/i, '')
    .replace(/^\d{14}_/, '')
    .trim()
    .toLowerCase();
}

function groupBy(items, keySelector) {
  const groups = new Map();
  for (const item of items) {
    const key = keySelector(item);
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }
  return groups;
}

function parseLocalFilename(filename) {
  const match = filename.match(LOCAL_FILENAME_PATTERN);
  if (!match) return { filename, version: null, name: null };
  return {
    filename,
    version: match[1],
    name: normalizeMigrationName(match[2]),
  };
}

export function reconcileMigrationHistory(remoteMigrations, localFilenames) {
  if (!Array.isArray(remoteMigrations)) {
    throw new TypeError('Remote migration history must be an array.');
  }
  if (!Array.isArray(localFilenames)) {
    throw new TypeError('Local migration filenames must be an array.');
  }

  const remote = remoteMigrations.map((entry, index) => {
    const version = String(entry?.version ?? '').trim();
    if (!VERSION_PATTERN.test(version)) {
      throw new TypeError('Remote migration at index ' + index + ' has an invalid 14-digit version.');
    }
    const rawName = typeof entry?.name === 'string' ? entry.name.trim() : '';
    return { version, rawName, name: normalizeMigrationName(rawName) };
  });

  const sqlFilenames = localFilenames.filter((filename) => String(filename).toLowerCase().endsWith('.sql'));
  const parsedLocal = sqlFilenames.map(parseLocalFilename);
  const invalidLocalFilenames = parsedLocal
    .filter((entry) => !entry.version)
    .map((entry) => entry.filename);
  const local = parsedLocal.filter((entry) => entry.version);

  const remoteByVersion = groupBy(remote, (entry) => entry.version);
  const localByVersion = groupBy(local, (entry) => entry.version);
  const remoteByName = groupBy(remote.filter((entry) => entry.name), (entry) => entry.name);
  const localByName = groupBy(local.filter((entry) => entry.name), (entry) => entry.name);

  const exactNameAndVersion = [];
  const sameVersionDifferentName = [];
  for (const [version, remoteEntries] of remoteByVersion) {
    const localEntries = localByVersion.get(version) ?? [];
    if (remoteEntries.length !== 1 || localEntries.length !== 1) continue;
    const remoteEntry = remoteEntries[0];
    const localEntry = localEntries[0];
    if (!remoteEntry.name) continue;
    if (remoteEntry.name === localEntry.name) {
      exactNameAndVersion.push({ version, name: remoteEntry.name, filename: localEntry.filename });
    } else {
      sameVersionDifferentName.push({
        version,
        remoteName: remoteEntry.rawName,
        localFilename: localEntry.filename,
      });
    }
  }

  const sameNameDifferentVersion = [];
  const ambiguousNameMatches = [];
  for (const [name, remoteEntries] of remoteByName) {
    const localEntries = localByName.get(name) ?? [];
    if (localEntries.length === 0) continue;
    if (remoteEntries.length === 1 && localEntries.length === 1) {
      if (remoteEntries[0].version !== localEntries[0].version) {
        sameNameDifferentVersion.push({
          name,
          remoteVersion: remoteEntries[0].version,
          localVersion: localEntries[0].version,
          localFilename: localEntries[0].filename,
        });
      }
    } else {
      ambiguousNameMatches.push({
        name,
        remoteVersions: remoteEntries.map((entry) => entry.version),
        localVersions: localEntries.map((entry) => entry.version),
      });
    }
  }

  const duplicateRemoteVersions = [...remoteByVersion.entries()]
    .filter(([, entries]) => entries.length > 1)
    .map(([version, entries]) => ({ version, count: entries.length }));
  const duplicateLocalVersions = [...localByVersion.entries()]
    .filter(([, entries]) => entries.length > 1)
    .map(([version, entries]) => ({ version, files: entries.map((entry) => entry.filename) }));

  const remoteOnlyVersions = [...remoteByVersion.entries()]
    .filter(([version]) => !localByVersion.has(version))
    .flatMap(([, entries]) => entries.map((entry) => ({ version: entry.version, name: entry.rawName })));
  const localOnlyVersions = [...localByVersion.entries()]
    .filter(([version]) => !remoteByVersion.has(version))
    .flatMap(([, entries]) => entries.map((entry) => ({ version: entry.version, filename: entry.filename })));
  const remoteEntriesWithoutNames = remote
    .filter((entry) => !entry.name)
    .map((entry) => ({ version: entry.version, name: entry.rawName }));

  const versionIntersection = [...remoteByVersion.keys()].filter((version) => localByVersion.has(version));
  const hasDrift =
    invalidLocalFilenames.length > 0 ||
    duplicateRemoteVersions.length > 0 ||
    duplicateLocalVersions.length > 0 ||
    remoteEntriesWithoutNames.length > 0 ||
    remoteOnlyVersions.length > 0 ||
    localOnlyVersions.length > 0 ||
    sameVersionDifferentName.length > 0 ||
    sameNameDifferentVersion.length > 0 ||
    ambiguousNameMatches.length > 0;

  return {
    status: hasDrift ? 'drift' : 'aligned',
    summary: {
      remoteRows: remote.length,
      remoteUniqueVersions: remoteByVersion.size,
      localSqlFiles: sqlFilenames.length,
      localUniqueVersions: localByVersion.size,
      versionIntersection: versionIntersection.length,
      exactNameAndVersionMatches: exactNameAndVersion.length,
      sameVersionDifferentName: sameVersionDifferentName.length,
      sameNameDifferentVersion: sameNameDifferentVersion.length,
      remoteOnlyVersions: remoteOnlyVersions.length,
      localOnlyVersions: localOnlyVersions.length,
      remoteEntriesWithoutNames: remoteEntriesWithoutNames.length,
      duplicateRemoteVersions: duplicateRemoteVersions.length,
      duplicateLocalVersions: duplicateLocalVersions.length,
      invalidLocalFilenames: invalidLocalFilenames.length,
      ambiguousNameMatches: ambiguousNameMatches.length,
    },
    exactNameAndVersion,
    sameVersionDifferentName,
    sameNameDifferentVersion,
    remoteOnlyVersions,
    localOnlyVersions,
    remoteEntriesWithoutNames,
    duplicateRemoteVersions,
    duplicateLocalVersions,
    invalidLocalFilenames,
    ambiguousNameMatches,
    limitations: [
      'This audit compares migration version/name metadata only; it does not compare SQL contents or checksums.',
      'A matching version/name does not prove the remote schema equals the local SQL result.',
      'A mismatch does not prove a missing schema change; renames, squashes, and reviewed history repairs may explain it.',
      'This tool is read-only and never emits migration repair, push, or backfill commands.',
    ],
  };
}

function parseArguments(argv) {
  const options = {
    remoteJson: null,
    localDir: resolve(process.cwd(), 'supabase', 'migrations'),
    format: 'text',
    failOnDrift: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--remote-json') options.remoteJson = argv[++index] ?? null;
    else if (argument === '--local-dir') options.localDir = resolve(argv[++index] ?? '');
    else if (argument === '--format') options.format = argv[++index] ?? 'text';
    else if (argument === '--fail-on-drift') options.failOnDrift = true;
    else if (argument === '--help' || argument === '-h') options.help = true;
    else throw new Error('Unknown argument: ' + argument);
  }

  if (!['text', 'json'].includes(options.format)) {
    throw new Error('--format must be text or json.');
  }
  return options;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    console.log(
      'Usage: node scripts/audit-migration-history.mjs --remote-json <list-migrations.json> [--local-dir <path>] [--format text|json] [--fail-on-drift]',
    );
    return;
  }
  if (!options.remoteJson) {
    throw new Error('--remote-json is required. Supply a saved, read-only Supabase list_migrations response.');
  }

  const parsedRemote = JSON.parse(await readFile(resolve(options.remoteJson), 'utf8'));
  const remoteMigrations = Array.isArray(parsedRemote) ? parsedRemote : parsedRemote?.migrations;
  if (!Array.isArray(remoteMigrations)) {
    throw new TypeError('Remote JSON must be an array or an object containing a migrations array.');
  }

  const entries = await readdir(options.localDir, { withFileTypes: true });
  const localFilenames = entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
  const report = reconcileMigrationHistory(remoteMigrations, localFilenames);

  if (options.format === 'json') {
    console.log(JSON.stringify(report, null, 2));
  } else {
    const { summary } = report;
    console.log('Migration history status: ' + report.status.toUpperCase());
    console.log('Remote rows: ' + summary.remoteRows + ' (' + summary.remoteUniqueVersions + ' unique versions)');
    console.log('Local SQL files: ' + summary.localSqlFiles + ' (' + summary.localUniqueVersions + ' unique versions)');
    console.log('Version intersection: ' + summary.versionIntersection);
    console.log('Exact name + version matches: ' + summary.exactNameAndVersionMatches);
    console.log('Same version, different name: ' + summary.sameVersionDifferentName);
    console.log('Same name, different version: ' + summary.sameNameDifferentVersion);
    console.log('Remote-only versions: ' + summary.remoteOnlyVersions);
    console.log('Local-only versions: ' + summary.localOnlyVersions);
    console.log('Remote entries without names: ' + summary.remoteEntriesWithoutNames);
    console.log('Duplicate remote/local versions: ' + summary.duplicateRemoteVersions + '/' + summary.duplicateLocalVersions);
    console.log('Invalid local filenames: ' + summary.invalidLocalFilenames);
    console.log('Ambiguous name matches: ' + summary.ambiguousNameMatches);
    console.log('Diagnostic only: review SQL checksums and applied schema state separately.');
  }

  if (options.failOnDrift && report.status !== 'aligned') process.exitCode = 2;
}

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isDirectRun) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
