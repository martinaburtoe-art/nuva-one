import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

const md5 = (value) => createHash('md5').update(value, 'utf8').digest('hex');
import { reconcileMigrationHistory } from './audit-migration-history.mjs';

describe('reconcileMigrationHistory', () => {
  it('accepts exact matches and strips nested timestamp prefixes', () => {
    const report = reconcileMigrationHistory(
      [{ version: '20260101000000', name: '20260101000000_create_table' }],
      ['20260101000000_20260101000000_create_table.sql', 'README.md'],
    );

    expect(report.status).toBe('aligned');
    expect(report.checksumStatus).toBe('not_provided');
    expect(report.summary).toMatchObject({
      remoteRows: 1,
      localSqlFiles: 1,
      versionIntersection: 1,
      exactNameAndVersionMatches: 1,
    });
  });

  it('reports same-name version drift without treating it as an exact match', () => {
    const report = reconcileMigrationHistory(
      [{ version: '20260102000000', name: '20260101000000_create_table' }],
      ['20260101000000_20260101000000_create_table.sql'],
    );

    expect(report.status).toBe('drift');
    expect(report.sameNameDifferentVersion).toEqual([
      {
        name: 'create_table',
        remoteVersion: '20260102000000',
        localVersion: '20260101000000',
        localFilename: '20260101000000_20260101000000_create_table.sql',
      },
    ]);
    expect(report.summary).toMatchObject({
      versionIntersection: 0,
      remoteOnlyVersions: 1,
      localOnlyVersions: 1,
    });
  });

  it('reports a version collision with different migration names', () => {
    const report = reconcileMigrationHistory(
      [{ version: '20260101000000', name: 'old_name' }],
      ['20260101000000_new_name.sql'],
    );

    expect(report.status).toBe('drift');
    expect(report.sameVersionDifferentName).toHaveLength(1);
    expect(report.summary.versionIntersection).toBe(1);
    expect(report.summary.exactNameAndVersionMatches).toBe(0);
  });

  it('flags empty remote names, duplicate versions, and invalid local filenames', () => {
    const report = reconcileMigrationHistory(
      [
        { version: '20260101000000', name: '' },
        { version: '20260101000000', name: 'duplicate' },
      ],
      ['20260101000000_first.sql', '20260101000000_second.sql', 'not-a-migration.sql'],
    );

    expect(report.status).toBe('drift');
    expect(report.summary).toMatchObject({
      remoteEntriesWithoutNames: 1,
      duplicateRemoteVersions: 1,
      duplicateLocalVersions: 1,
      invalidLocalFilenames: 1,
    });
  });

  it('does not guess when a migration name maps to multiple versions', () => {
    const report = reconcileMigrationHistory(
      [
        { version: '20260101000000', name: 'shared_name' },
        { version: '20260102000000', name: 'shared_name' },
      ],
      ['20260103000000_shared_name.sql'],
    );

    expect(report.status).toBe('drift');
    expect(report.summary.ambiguousNameMatches).toBe(1);
    expect(report.sameNameDifferentVersion).toHaveLength(0);
  });

  it('rejects malformed remote version identifiers', () => {
    expect(() =>
      reconcileMigrationHistory([{ version: 'latest', name: 'create_table' }], []),
    ).toThrow(/invalid 14-digit version/i);
  });

  it('matches stored SQL fingerprints for exact version mappings', () => {
    const filename = '20260101000000_create_table.sql';
    const sql = 'create table public.example (id uuid primary key);\n';
    const report = reconcileMigrationHistory(
      [
        {
          version: '20260101000000',
          name: 'create_table',
          statement_count: 1,
          statements_md5: md5(sql),
        },
      ],
      [filename],
      { [filename]: sql },
    );

    expect(report.sqlChecksumComparisons[0]).toMatchObject({
      mappingBasis: 'version',
      outcome: 'match',
      localFilename: filename,
    });
    expect(report.summary.sqlChecksumMatches).toBe(1);
    expect(report.summary.sqlChecksumMismatches).toBe(0);
    expect(report.status).toBe('aligned');
    expect(report.checksumStatus).toBe('complete');
  });

  it('uses a unique migration name to compare SQL when timestamps drift', () => {
    const filename = '20260101000000_create_table.sql';
    const sql = 'create table public.example (id uuid primary key);\n';
    const report = reconcileMigrationHistory(
      [
        {
          version: '20260102000000',
          name: 'create_table',
          statement_count: 1,
          statements_md5: md5(sql),
        },
      ],
      [filename],
      { [filename]: sql },
    );

    expect(report.status).toBe('drift');
    expect(report.sqlChecksumComparisons[0]).toMatchObject({
      mappingBasis: 'unique_name',
      outcome: 'match',
      localVersion: '20260101000000',
    });
  });

  it('reports a SQL checksum mismatch without treating it as a match', () => {
    const filename = '20260101000000_create_table.sql';
    const localSql = 'create table public.example (id uuid primary key);\n';
    const report = reconcileMigrationHistory(
      [
        {
          version: '20260101000000',
          name: 'create_table',
          statement_count: 1,
          statements_md5: md5('create table public.example (id text primary key);\n'),
        },
      ],
      [filename],
      { [filename]: localSql },
    );

    expect(report.status).toBe('drift');
    expect(report.sqlChecksumComparisons[0].outcome).toBe('mismatch');
    expect(report.summary.sqlChecksumMismatches).toBe(1);
    expect(report.checksumStatus).toBe('mismatch');
  });

  it('classifies whitespace-insensitive matches as candidates, not exact matches', () => {
    const filename = '20260101000000_create_table.sql';
    const localSql = 'create table public.example (id uuid primary key);\n';
    const remoteSql = 'create table public.example ( id uuid primary key );\n';
    const compactMd5 = (value) => md5(value.replace(/\s+/g, ''));

    const report = reconcileMigrationHistory(
      [
        {
          version: '20260101000000',
          name: 'create_table',
          statement_count: 1,
          statements_md5: md5(remoteSql),
          statements_compact_md5: compactMd5(remoteSql),
        },
      ],
      [filename],
      { [filename]: localSql },
    );

    expect(report.sqlChecksumComparisons[0]).toMatchObject({
      outcome: 'whitespace_only_candidate',
      reason: 'Whitespace-insensitive fingerprints match; SQL string literals and tokens still require manual review.',
    });
    expect(report.summary.sqlChecksumMatches).toBe(0);
    expect(report.summary.sqlChecksumWhitespaceCandidates).toBe(1);
    expect(report.summary.sqlChecksumMismatches).toBe(0);
    expect(report.status).toBe('review_required');
    expect(report.checksumStatus).toBe('incomplete');
  });

  it('keeps multi-statement snapshots UNKNOWN instead of guessing', () => {
    const filename = '20260101000000_create_table.sql';
    const sql = 'create table public.example (id uuid primary key);\n';
    const report = reconcileMigrationHistory(
      [
        {
          version: '20260101000000',
          name: 'create_table',
          statement_count: 2,
          statements_md5: md5(sql),
        },
      ],
      [filename],
      { [filename]: sql },
    );

    expect(report.sqlChecksumComparisons[0]).toMatchObject({
      outcome: 'unknown',
      reason: 'remote_statement_count_not_one',
    });
    expect(report.summary.sqlChecksumUnknown).toBe(1);
    expect(report.status).toBe('review_required');
    expect(report.checksumStatus).toBe('incomplete');
  });

  it('requires review when a checksum snapshot omits a row fingerprint', () => {
    const filename = '20260101000000_create_table.sql';
    const report = reconcileMigrationHistory(
      [
        {
          version: '20260101000000',
          name: 'create_table',
          statement_count: 1,
        },
      ],
      [filename],
      { [filename]: 'create table public.example (id uuid primary key);\\n' },
    );

    expect(report.sqlChecksumComparisons[0]).toMatchObject({
      outcome: 'unknown',
      reason: 'remote_checksum_unavailable',
    });
    expect(report.status).toBe('review_required');
    expect(report.checksumStatus).toBe('incomplete');
  });

  it('does not checksum ambiguous same-name mappings', () => {
    const filename = '20260103000000_shared_name.sql';
    const sql = 'select 1;\n';
    const report = reconcileMigrationHistory(
      [
        {
          version: '20260101000000',
          name: 'shared_name',
          statement_count: 1,
          statements_md5: md5(sql),
        },
        {
          version: '20260102000000',
          name: 'shared_name',
          statement_count: 1,
          statements_md5: md5(sql),
        },
      ],
      [filename],
      { [filename]: sql },
    );

    expect(report.sqlChecksumComparisons).toHaveLength(2);
    expect(report.sqlChecksumComparisons.every((entry) => entry.outcome === 'unknown')).toBe(true);
    expect(report.sqlChecksumComparisons.every((entry) => entry.reason === 'ambiguous_name_mapping')).toBe(true);
    expect(report.status).toBe('review_required');
    expect(report.checksumStatus).toBe('incomplete');
  });
});
