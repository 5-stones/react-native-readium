#!/usr/bin/env node
/**
 * Builds resources/lcp-moby-dick.epub: the bundled Moby Dick, protected with Readium LCP's
 * *basic profile* (passphrase "test"), for end-to-end tests.
 *
 * The basic profile is LCP's open test profile: the user key is SHA-256(passphrase), and keys
 * and resources are AES-256-CBC with the IV prepended. Its license is signed by a throwaway
 * self-signed provider certificate, not one EDRLab issued, so only the debug basic-profile client
 * in this app opens it; EDRLab's liblcp rejects it as an integrity failure. (liblcp aborts the app
 * on a certificate it can't parse, so the certificate must be a real one.) Needs `openssl`.
 *
 *   node apps/example-native/scripts/make-lcp-fixture.js
 */
const { execFileSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const PASSPHRASE = 'test';
const resources = path.join(__dirname, '../resources');
const source = path.join(resources, 'moby-dick.epub');
const output = path.join(resources, 'lcp-moby-dick.epub');

/** LCP's encrypted form: a random IV followed by AES-256-CBC ciphertext. */
const encrypt = (key, data) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  return Buffer.concat([iv, cipher.update(data), cipher.final()]);
};

/** Files LCP leaves in the clear: the container, the package document and the NCX. */
const isClear = (relative) =>
  relative === 'mimetype' ||
  relative.startsWith('META-INF/') ||
  /\.(opf|ncx)$/i.test(relative);

const walk = (dir, root = dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full, root) : [path.relative(root, full)];
  });

/** JSON with keys sorted and no whitespace: the form an LCP license signature covers. */
const canonical = (value) =>
  Array.isArray(value)
    ? `[${value.map(canonical).join(',')}]`
    : value && typeof value === 'object'
    ? `{${Object.keys(value)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
        .join(',')}}`
    : JSON.stringify(value);

const work = fs.mkdtempSync(path.join(os.tmpdir(), 'lcp-fixture-'));
execFileSync('unzip', ['-q', source, '-d', work]);

// A throwaway provider certificate, outside the EPUB's folder.
const keys = fs.mkdtempSync(path.join(os.tmpdir(), 'lcp-fixture-keys-'));
execFileSync(
  'openssl',
  [
    'req',
    '-x509',
    '-newkey',
    'ec',
    '-pkeyopt',
    'ec_paramgen_curve:P-256',
    '-nodes',
    '-keyout',
    path.join(keys, 'key.pem'),
    '-out',
    path.join(keys, 'cert.pem'),
    '-days',
    '3650',
    '-subj',
    '/CN=react-native-readium test provider',
  ],
  { stdio: 'ignore' }
);
const privateKey = fs.readFileSync(path.join(keys, 'key.pem'));
const certificate = new crypto.X509Certificate(
  fs.readFileSync(path.join(keys, 'cert.pem'))
).raw.toString('base64');
fs.rmSync(keys, { recursive: true, force: true });

const userKey = crypto.createHash('sha256').update(PASSPHRASE).digest();
const contentKey = crypto.randomBytes(32);

const encrypted = walk(work)
  .map((relative) => relative.split(path.sep).join('/'))
  .filter((relative) => !isClear(relative))
  .sort();

for (const relative of encrypted) {
  const file = path.join(work, relative);
  fs.writeFileSync(file, encrypt(contentKey, fs.readFileSync(file)));
}

const id = crypto.randomUUID();
const now = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
const license = {
  provider: 'https://github.com/5-stones/react-native-readium',
  id,
  issued: now,
  updated: now,
  encryption: {
    profile: 'http://readium.org/lcp/basic-profile',
    content_key: {
      algorithm: 'http://www.w3.org/2001/04/xmlenc#aes256-cbc',
      encrypted_value: encrypt(userKey, contentKey).toString('base64'),
    },
    user_key: {
      algorithm: 'http://www.w3.org/2001/04/xmlenc#sha256',
      text_hint: 'test',
      key_check: encrypt(userKey, Buffer.from(id)).toString('base64'),
    },
  },
  // No status link: there is no license server to ask.
  links: [
    {
      rel: 'hint',
      href: 'https://github.com/5-stones/react-native-readium',
      type: 'text/html',
    },
    {
      rel: 'publication',
      href: 'https://example.com/lcp-moby-dick.epub',
      type: 'application/epub+zip',
    },
  ],
  user: { id: 'e2e' },
  rights: { print: 10, copy: 4000 },
};
license.signature = {
  algorithm: 'http://www.w3.org/2001/04/xmldsig-more#ecdsa-sha256',
  certificate,
  value: crypto
    .sign('sha256', Buffer.from(canonical(license)), privateKey)
    .toString('base64'),
};

const encryptedData = encrypted
  .map(
    (relative) => `  <EncryptedData xmlns="http://www.w3.org/2001/04/xmlenc#">
    <EncryptionMethod Algorithm="http://www.w3.org/2001/04/xmlenc#aes256-cbc"/>
    <KeyInfo xmlns="http://www.w3.org/2000/09/xmldsig#">
      <RetrievalMethod URI="license.lcpl#/encryption/content_key" Type="http://readium.org/2014/01/lcp#EncryptedContentKey"/>
    </KeyInfo>
    <CipherData>
      <CipherReference URI="${encodeURI(relative)}"/>
    </CipherData>
  </EncryptedData>`
  )
  .join('\n');

fs.mkdirSync(path.join(work, 'META-INF'), { recursive: true });
fs.writeFileSync(
  path.join(work, 'META-INF/license.lcpl'),
  JSON.stringify(license)
);
fs.writeFileSync(
  path.join(work, 'META-INF/encryption.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<encryption xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
${encryptedData}
</encryption>
`
);

// An EPUB's mimetype must come first, stored uncompressed.
fs.rmSync(output, { force: true });
execFileSync('zip', ['-q', '-X', '-0', output, 'mimetype'], { cwd: work });
execFileSync('zip', ['-q', '-X', '-r', output, '.', '-x', 'mimetype'], {
  cwd: work,
});
fs.rmSync(work, { recursive: true, force: true });

console.log(
  `Wrote ${path.relative(process.cwd(), output)}: ${
    encrypted.length
  } resources encrypted, passphrase "${PASSPHRASE}".`
);
