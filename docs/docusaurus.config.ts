import { existsSync, readFileSync } from 'node:fs';
import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import type { Options as DocsOptions } from '@docusaurus/plugin-content-docs';

const repo = 'https://github.com/5-stones/react-native-readium';

/** The released versions of one doc set, newest first, as `docusaurus docs:version` records them. */
function releasedVersions(file: string): string[] {
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : [];
}

/**
 * `main` is always "Next". Once a release has cut a version (scripts/cut-docs-version.js), the
 * newest one is served by default and Next moves to /next.
 */
function versioning(versions: string[], prefix = ''): Partial<DocsOptions> {
  return {
    lastVersion: versions[0] ?? 'current',
    versions: {
      current: versions.length
        ? { label: `${prefix}Next`, path: 'next', banner: 'unreleased' }
        : { label: `${prefix}Next`, banner: 'none' },
      ...Object.fromEntries(
        versions.map((version) => [version, { label: `${prefix}${version}` }])
      ),
    },
  };
}

/**
 * "Edit this page" on hand-written pages in Next only. Generated API pages are edited through the
 * docblocks in each package's source, and released versions are frozen snapshots.
 */
const editUrl: DocsOptions['editUrl'] = ({
  version,
  versionDocsDirPath,
  docPath,
}) =>
  version === 'current' && !docPath.startsWith('api/')
    ? `${repo}/edit/main/docs/${versionDocsDirPath}/${docPath}`
    : undefined;

const readiumVersions = releasedVersions('versions.json');
const lcpVersions = releasedVersions('lcp_versions.json');

const config: Config = {
  title: 'React Native Readium',
  tagline: 'An ebook reader for React Native, built on the Readium toolkits',
  favicon: 'img/favicon.ico',

  url: 'https://5-stones.github.io',
  baseUrl: '/react-native-readium/',
  organizationName: '5-stones',
  projectName: 'react-native-readium',
  trailingSlash: false,

  onBrokenLinks: 'throw',
  onBrokenAnchors: 'throw',
  markdown: {
    hooks: { onBrokenMarkdownLinks: 'throw' },
  },

  i18n: { defaultLocale: 'en', locales: ['en'] },

  presets: [
    [
      'classic',
      {
        // react-native-readium, versioned with that package.
        docs: {
          path: 'core',
          routeBasePath: 'docs',
          sidebarPath: './sidebars.ts',
          editUrl,
          ...versioning(readiumVersions),
        },
        blog: false,
        theme: { customCss: './src/css/custom.css' },
      } satisfies Preset.Options,
    ],
  ],

  plugins: [
    [
      // react-native-readium-lcp, versioned with that package.
      '@docusaurus/plugin-content-docs',
      {
        id: 'lcp',
        path: 'lcp',
        routeBasePath: 'lcp',
        sidebarPath: './sidebars-lcp.ts',
        editUrl,
        ...versioning(lcpVersions, 'LCP '),
      } satisfies DocsOptions,
    ],
  ],

  themeConfig: {
    colorMode: { respectPrefersColorScheme: true },
    navbar: {
      title: 'React Native Readium',
      logo: { alt: 'React Native Readium', src: 'img/logo.svg' },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docs',
          position: 'left',
          label: 'Core',
        },
        {
          type: 'docSidebar',
          sidebarId: 'lcp',
          docsPluginId: 'lcp',
          position: 'left',
          label: 'LCP',
        },
        // Version pickers appear once a release has cut a version.
        ...(readiumVersions.length
          ? [{ type: 'docsVersionDropdown', position: 'right' } as const]
          : []),
        ...(lcpVersions.length
          ? [
              {
                type: 'docsVersionDropdown',
                docsPluginId: 'lcp',
                position: 'right',
              } as const,
            ]
          : []),
        { href: repo, label: 'GitHub', position: 'right' },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Getting started',
              to: '/docs/getting-started/installation',
            },
            { label: 'Readium LCP', to: '/lcp' },
          ],
        },
        {
          title: 'Packages',
          items: [
            {
              label: 'react-native-readium',
              href: 'https://www.npmjs.com/package/react-native-readium',
            },
            {
              label: 'react-native-readium-lcp',
              href: 'https://www.npmjs.com/package/react-native-readium-lcp',
            },
          ],
        },
        {
          title: 'More',
          items: [
            { label: 'GitHub', href: repo },
            { label: 'Readium', href: 'https://readium.org/' },
          ],
        },
      ],
      copyright: `Released under the MIT license.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: [
        'ruby',
        'groovy',
        'swift',
        'kotlin',
        'bash',
        'objectivec',
      ],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
