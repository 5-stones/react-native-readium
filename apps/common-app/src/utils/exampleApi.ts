import { Platform } from 'react-native';

/**
 * Where the example API lives — the Next.js app in `apps/example-nextjs`,
 * which stands in for a publication host that guards its files and hands out
 * locations that expire.
 *
 * Run it with `yarn workspace example-nextjs dev` before opening a book that
 * points at it.
 */
export const EXAMPLE_API_ORIGIN = Platform.select({
  // The Android emulator reaches the machine it runs on at this address;
  // `localhost` would be the emulator itself. On a physical device, neither
  // works: put your machine's address on the LAN here.
  android: 'http://10.0.2.2:3200',
  default: 'http://localhost:3200',
}) as string;

/** What the example API accepts. Constant on purpose; it guards nothing real. */
export const EXAMPLE_API_TOKEN = 'example-reader-token';

/**
 * A publication's identity url at the example API. Its bytes are somewhere
 * else, at a location that `resolveSource` has to go and ask for.
 *
 * @param name A file in `apps/example-native/resources`, which is what the
 *   example API serves — drop one in and it is available.
 */
export const examplePublicationUrl = (name: string): string =>
  `${EXAMPLE_API_ORIGIN}/api/publications/${name}`;

export const isExampleApiUrl = (url: string): boolean =>
  url.includes('/api/publications/');

/** How to get the example API running, for when it plainly is not. */
export const EXAMPLE_API_UNREACHABLE =
  `Couldn't reach the example API at ${EXAMPLE_API_ORIGIN}. ` +
  'Start it with `yarn workspace example-nextjs dev` and open this book ' +
  'again. On a physical device, set EXAMPLE_API_ORIGIN in ' +
  "apps/common-app/src/utils/exampleApi.ts to your machine's address on the " +
  'LAN.';
