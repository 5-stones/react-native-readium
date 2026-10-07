#!/usr/bin/env node
/**
 * Fails when files about to be committed (--staged) or already tracked (default, for CI) would
 * leak EDRLab's private liblcp setup:
 *
 * - a Podfile.lock or Xcode project linking R2LCPClient: linking liblcp is local to each
 *   developer, and Podfile.lock records the podspec URL unless readium_lcp_pods redacts it;
 * - the configured liblcp podspec URL itself, anywhere. It's read from READIUM_LCP_IOS_PODSPEC in
 *   the environment and in the apps' .env files, so only a local run knows it.
 *
 *   node scripts/check-liblcp-leaks.js [--staged]
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const staged = process.argv.includes('--staged');
const git = (...args) =>
  execFileSync('git', args, { cwd: root, maxBuffer: 1 << 30 });

const files = git(
  ...(staged
    ? ['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z']
    : ['ls-files', '-z'])
)
  .toString()
  .split('\0')
  .filter(Boolean);

/** A value from a .env file: KEY=value lines, with optional `export` and quotes. */
const dotenvValue = (file, name) => {
  const line = fs
    .readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .find((l) => new RegExp(`^\\s*(export\\s+)?${name}\\s*=`).test(l));
  return line
    ?.split('=')
    .slice(1)
    .join('=')
    .trim()
    .replace(/^(['"])(.*)\1$/, '$2');
};

const appsDir = path.join(root, 'apps');
const envFiles = fs
  .readdirSync(appsDir)
  .map((app) => path.join(appsDir, app, '.env'))
  .filter((file) => fs.existsSync(file));
const secrets = [
  process.env.READIUM_LCP_IOS_PODSPEC,
  ...envFiles.map((file) => dotenvValue(file, 'READIUM_LCP_IOS_PODSPEC')),
]
  .map((value) => value?.trim())
  .filter((value, i, all) => value && all.indexOf(value) === i);

const linksLiblcp = (file) =>
  /(^|\/)(Podfile\.lock|project\.pbxproj)$/.test(file);

const problems = [];
for (const file of files) {
  // The staged version for a commit, the checked-out one for CI.
  const content = staged
    ? git('show', `:${file}`)
    : fs.existsSync(path.join(root, file))
    ? fs.readFileSync(path.join(root, file))
    : Buffer.alloc(0);
  if (content.includes(0)) continue; // binary

  const text = content.toString('utf8');
  if (secrets.some((secret) => text.includes(secret))) {
    problems.push(`${file}: contains your liblcp podspec URL`);
  } else if (linksLiblcp(file) && text.includes('R2LCPClient')) {
    problems.push(`${file}: links R2LCPClient (liblcp)`);
  }
}

if (problems.length) {
  console.error(
    [
      staged
        ? "Refusing to commit EDRLab's private liblcp setup:"
        : "Tracked files contain EDRLab's private liblcp setup:",
      ...problems.map((p) => `  - ${p}`),
      '',
      'Unstage those files (git restore --staged <file>), or rerun `pod install` with',
      'READIUM_LCP_IOS_PODSPEC unset to put the iOS project back to its unlinked state.',
    ].join('\n')
  );
  process.exit(1);
}
