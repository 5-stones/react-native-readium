const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARKER = '# added by with-readium-pods';

function patchPodfile(podfile, monorepoRoot, projectRoot) {
  if (podfile.includes(MARKER)) {
    return podfile;
  }

  const podsScript = path
    .relative(
      path.join(projectRoot, 'ios'),
      path.join(monorepoRoot, 'scripts', 'readium_pods.rb')
    )
    .split(path.sep)
    .join('/');
  const postInstallScript = path
    .relative(
      path.join(projectRoot, 'ios'),
      path.join(monorepoRoot, 'scripts', 'readium_post_install.rb')
    )
    .split(path.sep)
    .join('/');

  const sourceLines = [
    `${MARKER}`,
    "source 'https://github.com/readium/podspecs'",
    "source 'https://cdn.cocoapods.org/'",
    `require_relative '${podsScript}'`,
    `require_relative '${postInstallScript}'`,
    '',
  ].join('\n');

  let out = sourceLines + podfile;

  if (!/^\s*readium_pods\s*$/m.test(out)) {
    out = out.replace(
      /(use_react_native!\([\s\S]*?\)\s*)/,
      `$1\n  readium_pods\n`
    );
  }

  if (/readium_post_install\(installer\)/.test(out)) {
    return out;
  }

  if (/post_install do \|installer\|/.test(out)) {
    out = out.replace(
      /(post_install do \|installer\|[\s\S]*?)(\n\s*end\s*\n\s*end\s*$)/m,
      `$1\n    readium_post_install(installer)$2`
    );
  } else {
    out = out.replace(
      /(\n\s*end\s*$)/,
      `\n  post_install do |installer|\n    readium_post_install(installer)\n  end\n$1`
    );
  }

  return out;
}

const withReadiumPods = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const monorepoRoot = path.resolve(projectRoot, '../..');
      const podfilePath = path.join(projectRoot, 'ios', 'Podfile');
      const podfile = fs.readFileSync(podfilePath, 'utf8');
      const patched = patchPodfile(podfile, monorepoRoot, projectRoot);
      if (patched !== podfile) {
        fs.writeFileSync(podfilePath, patched);
      }
      return cfg;
    },
  ]);
};

module.exports = withReadiumPods;
