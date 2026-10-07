#!/usr/bin/env node
/**
 * Cuts a docs version when a package releases a new major or minor version: X.Y.0 snapshots its
 * docs, guides and generated API reference, as version "X.Y". Patches and prereleases don't cut
 * one, and neither does a version that already exists. The snapshot is staged, so the release
 * commit includes it.
 *
 * Each package's release-it `after:bump` hook runs it:
 *
 *   node ../../docs/scripts/cut-docs-version.js <readium|lcp> <version>
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const docsDir = path.resolve(__dirname, '..');

/** The doc set for each package: its Docusaurus docs plugin id, and what versioning writes. */
const docSets = {
  readium: {
    command: 'docs:version',
    files: ['versions.json', 'versioned_docs', 'versioned_sidebars'],
  },
  lcp: {
    command: 'docs:version:lcp',
    files: ['lcp_versions.json', 'lcp_versioned_docs', 'lcp_versioned_sidebars'],
  },
};

const [docSetName, version] = process.argv.slice(2);
const docSet = docSets[docSetName];
if (!docSet || !version) {
  console.error('Usage: cut-docs-version.js <readium|lcp> <version>');
  process.exit(1);
}

const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
if (!match) {
  console.log(`[docs] ${version} is a prerelease; not cutting a docs version.`);
  process.exit(0);
}
const [, major, minor, patch] = match;
if (patch !== '0') {
  console.log(`[docs] ${version} is a patch release; not cutting a docs version.`);
  process.exit(0);
}

const name = `${major}.${minor}`;
const versionsFile = path.join(docsDir, docSet.files[0]);
const versions = fs.existsSync(versionsFile)
  ? JSON.parse(fs.readFileSync(versionsFile, 'utf8'))
  : [];
if (versions.includes(name)) {
  console.log(`[docs] ${docSetName} ${name} already exists; not cutting it again.`);
  process.exit(0);
}

const run = (command, args) =>
  execFileSync(command, args, { cwd: docsDir, stdio: 'inherit' });

// The API reference is generated, so it must be current before it's snapshotted.
run('yarn', ['api']);
run('yarn', ['docusaurus', docSet.command, name]);
run('git', ['add', ...docSet.files]);

console.log(`[docs] Cut ${docSetName} docs version ${name}.`);
