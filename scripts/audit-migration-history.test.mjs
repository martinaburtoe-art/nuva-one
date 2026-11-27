import { describe, expect, it } from 'vitest';
import { reconcileMigrationHistory } from './audit-migration-history.mjs';

describe('reconcileMigrationHistory', () => {
  it('accepts exact matches and strips nested timestamp prefixes', () => {
    const report = reconcileMigrationHistory(
      [{ version: '20260101000000', name: '20260101000000_create_table' }],
      ['20260101000000_20260101000000_create_table.sql', 'README.md'],
    );

    expect(report.status).toBe('aligned');
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
});
