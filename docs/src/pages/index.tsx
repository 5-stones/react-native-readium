import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import CodeBlock from '@theme/CodeBlock';
import Heading from '@theme/Heading';
import Layout from '@theme/Layout';

import styles from './index.module.css';

const features = [
  {
    title: 'EPUB and PDF',
    description:
      'Reflowable and fixed-layout EPUB 2 and 3, and PDF, in one view.',
    to: '/docs/supported-formats',
  },
  {
    title: 'iOS, Android and web',
    description:
      "Built on Readium's Swift, Kotlin and TypeScript toolkits, behind one React API.",
    to: '/docs/getting-started/installation',
  },
  {
    title: 'Navigation',
    description:
      'Track the reading position, restore it, and jump to chapters, bookmarks and positions.',
    to: '/docs/guides/navigation',
  },
  {
    title: 'Preferences',
    description:
      'Themes, fonts, margins, scrolling and more, with capabilities that say what applies.',
    to: '/docs/guides/preferences',
  },
  {
    title: 'Highlights and notes',
    description:
      'Custom text-selection actions and decorations, for highlights, underlines and notes.',
    to: '/docs/guides/highlights',
  },
  {
    title: 'Search',
    description:
      'Full-text search with paged results, and a hook that manages them.',
    to: '/docs/guides/search',
  },
  {
    title: 'Readium LCP',
    description:
      'Open DRM-protected books from libraries and bookstores, with your own passphrase UI.',
    to: '/lcp',
  },
];

function Hero() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={styles.hero}>
      <div className="container">
        <img
          className={styles.logo}
          src={useBaseUrl('/img/logo.svg')}
          alt=""
          width={72}
          height={72}
        />
        <Heading as="h1" className={styles.title}>
          {siteConfig.title}
        </Heading>
        <p className={styles.tagline}>{siteConfig.tagline}</p>
        <div className={styles.install}>
          <CodeBlock language="sh">
            yarn add react-native-readium react-native-nitro-modules
          </CodeBlock>
        </div>
        <div className={styles.buttons}>
          <Link
            className="button button--primary button--lg"
            to="/docs/getting-started/installation"
          >
            Get started
          </Link>
          <Link className="button button--secondary button--lg" to="/docs/api">
            API reference
          </Link>
        </div>
      </div>
    </header>
  );
}

function Features() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className={styles.grid}>
          {features.map((feature) => (
            <Link key={feature.title} to={feature.to} className={styles.card}>
              <Heading as="h3">{feature.title}</Heading>
              <p>{feature.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function Demo() {
  return (
    <section className={styles.demo}>
      <div className="container">
        <div className={styles.demoImages}>
          <img
            src={useBaseUrl('/img/demo-light-mode.gif')}
            alt="Reading in light mode"
            loading="lazy"
          />
          <img
            src={useBaseUrl('/img/demo-dark-mode.gif')}
            alt="Reading in dark mode"
            loading="lazy"
          />
          <img
            src={useBaseUrl('/img/demo-decorators.gif')}
            alt="Highlighting text"
            loading="lazy"
          />
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout description={siteConfig.tagline}>
      <Hero />
      <main>
        <Features />
        <Demo />
      </main>
    </Layout>
  );
}
