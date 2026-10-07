import { NitroModules } from 'react-native-nitro-modules';
import type { HybridObject } from 'react-native-nitro-modules';

import type { LcpErrorCode, ReadiumLCP } from './specs/ReadiumLCP.nitro';

export type {
  AcquirePublicationOptions,
  AddPassphraseOptions,
  GetLicenseOptions,
  LcpAcquiredPublication,
  LcpAuthReason,
  LcpAuthRequest,
  LcpCapabilities,
  LcpErrorCode,
  LcpInitOptions,
  LcpLicense,
  LcpAuthHandler,
  LcpLicenseStatus,
  LcpLink,
  LcplSource,
  RenewLoanOptions,
} from './specs/ReadiumLCP.nitro';

/** Every `LcpErrorCode`, to recognize the codes native code sends. */
const lcpErrorCodes = [
  'notInitialized',
  'registryUnavailable',
  'unsupported',
  'openFailed',
  'missingPassphrase',
  'addPassphraseFailed',
  'forgetPassphrasesFailed',
  'notALicenseDocument',
  'licenseIsBusy',
  'licenseIntegrity',
  'licenseCancelled',
  'licenseReturned',
  'licenseNotStarted',
  'licenseExpired',
  'licenseRevoked',
  'licenseContainer',
  'licenseInteractionNotAvailable',
  'licenseProfileNotSupported',
  'invalidRenewalPeriod',
  'renewFailed',
  'alreadyReturnedOrExpired',
  'returnFailed',
  'crlFetching',
  'parsing',
  'network',
  'unknown',
] as const satisfies readonly LcpErrorCode[];

// Fails to compile if the spec gains a code this list doesn't have.
type MissingErrorCode = Exclude<LcpErrorCode, (typeof lcpErrorCodes)[number]>;
const _allErrorCodesListed: [MissingErrorCode] extends [never] ? true : never =
  true;

/** Swift sends codes as named in the spec; Kotlin's generated enum sends them uppercased. */
const toErrorCode = (name: string): LcpErrorCode =>
  lcpErrorCodes.find((code) => code.toLowerCase() === name.toLowerCase()) ??
  'unknown';

/** What native code reports with an error, besides its code. */
export interface LcpErrorDetails {
  /** When the license's status changed, or when it starts or expired. */
  date?: Date;
  /** For `licenseRevoked`: how many devices had registered the license. */
  devicesCount?: number;
  /** For `invalidRenewalPeriod`: the latest end date a renewal can ask for. */
  maxRenewDate?: Date;
  /** Readium's own description of the error, for logs; not meant for users. */
  detail?: string;
}

/**
 * `message` is plain English, fit to show a user. To word or translate it yourself, switch on
 * `code` and use the details, e.g. `date` for the license-status codes.
 */
export class LcpError extends Error implements LcpErrorDetails {
  readonly code: LcpErrorCode;
  readonly date?: Date;
  readonly devicesCount?: number;
  readonly maxRenewDate?: Date;
  readonly detail?: string;

  constructor(code: LcpErrorCode, details: LcpErrorDetails = {}) {
    super(describeLcpError(code, details));
    this.name = 'LcpError';
    this.code = code;
    Object.assign(this, details);
  }
}

const formatDate = (date: Date) =>
  date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

/**
 * The plain-English message an {@link LcpError} with this code carries, for a code you already
 * have, such as a license's `restriction`.
 */
export function describeLcpError(
  code: LcpErrorCode,
  { date, devicesCount, maxRenewDate, detail }: LcpErrorDetails = {}
): string {
  const on = date ? ` on ${formatDate(date)}` : '';
  switch (code) {
    case 'licenseRevoked':
      return (
        `This license was revoked by its provider${on}.` +
        (devicesCount
          ? ` It had been registered on ${devicesCount} device${
              devicesCount === 1 ? '' : 's'
            }.`
          : '')
      );
    case 'licenseReturned':
      return `This book was returned${on}.`;
    case 'licenseCancelled':
      return `This license was cancelled${on}.`;
    case 'licenseExpired':
      return `This license expired${on}.`;
    case 'licenseNotStarted':
      return date
        ? `This license can't be used until ${formatDate(date)}.`
        : "This license can't be used yet.";
    case 'missingPassphrase':
      return 'The passphrase is needed to open this book.';
    case 'licenseIntegrity':
      return "This license is damaged, or wasn't issued by a trusted provider.";
    case 'licenseProfileNotSupported':
      return "This license uses a kind of protection this app doesn't support.";
    case 'notALicenseDocument':
    case 'parsing':
      return "This isn't a valid LCP license.";
    case 'licenseIsBusy':
      return 'This license is in use. Try again in a moment.';
    case 'licenseContainer':
      return "The license couldn't be read from or saved to the book's file.";
    case 'licenseInteractionNotAvailable':
      return "This license needs an action that isn't available here.";
    case 'invalidRenewalPeriod':
      return maxRenewDate
        ? `The loan can only be extended until ${formatDate(maxRenewDate)}.`
        : "The loan can't be extended to that date.";
    case 'renewFailed':
      return "The loan couldn't be renewed.";
    case 'alreadyReturnedOrExpired':
      return 'This book was already returned, or its loan has ended.';
    case 'returnFailed':
      return "The book couldn't be returned.";
    case 'network':
      return "The license server couldn't be reached. Check your connection.";
    case 'crlFetching':
      return "The list of revoked certificates couldn't be downloaded. Check your connection.";
    case 'openFailed':
      return "The file couldn't be opened.";
    case 'addPassphraseFailed':
      return "The passphrase couldn't be saved.";
    case 'forgetPassphrasesFailed':
      return "The saved passphrases couldn't be removed.";
    case 'notInitialized':
      return 'LCP is not set up yet. Call LCP.initialize() first.';
    case 'registryUnavailable':
      return "LCP couldn't be connected to react-native-readium.";
    case 'unsupported':
      return detail ?? "This isn't available on this platform.";
    default:
      return 'Something went wrong with this license.';
  }
}

let nativeLCP: ReadiumLCP | undefined;
const native = (): ReadiumLCP => {
  nativeLCP ??= NitroModules.createHybridObject<ReadiumLCP>('ReadiumLCP');
  return nativeLCP;
};

/**
 * Native code rejects with `[code] {json}` on one line: Swift's `LCPBridgeError.description`,
 * and Kotlin's `LcpBridgeException` message. On Android, Nitro's text is the exception's whole
 * stack trace, which starts with `<class>: <message>`, so the code is searched for and the JSON
 * ends with its line. Anything else is passed through.
 */
const toLcpError = (error: unknown): unknown => {
  if (error instanceof LcpError) return error;
  const message = error instanceof Error ? error.message : String(error);
  const match = /\[(\w+)\] ([\s\S]*)/.exec(message);
  if (!match) return error;

  const rest = match[2]!.split('\n')[0]!.trim();
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rest);
  } catch {
    payload = { detail: rest };
  }
  const dateFrom = (value: unknown) =>
    typeof value === 'number' ? new Date(value) : undefined;

  return new LcpError(toErrorCode(match[1]!), {
    date: dateFrom(payload.date),
    devicesCount:
      typeof payload.devicesCount === 'number'
        ? payload.devicesCount
        : undefined,
    maxRenewDate: dateFrom(payload.maxRenewDate),
    detail: typeof payload.detail === 'string' ? payload.detail : undefined,
  });
};

/** Calls native, rejecting with an `LcpError` where native rejects with its coded text. */
const lcpCall = async <T>(call: () => Promise<T>): Promise<T> => {
  try {
    return await call();
  } catch (error) {
    throw toLcpError(error);
  }
};

/** Fetches an LCPL, failing with an `LcpError` like every other call. */
const downloadLcpl = async (url: string): Promise<string> => {
  let response: Response;
  try {
    response = await fetch(url);
  } catch (error) {
    throw new LcpError('network', { detail: String(error) });
  }
  if (!response.ok) {
    throw new LcpError('network', {
      detail: `${url} answered HTTP ${response.status}`,
    });
  }
  return response.text();
};

/** Native acquires from a path or JSON, so a `{ url }` license is downloaded here first. */
const acquirePublication: ReadiumLCP['acquirePublication'] = (
  source,
  options
) =>
  lcpCall(async () =>
    native().acquirePublication(
      source.url === undefined
        ? source
        : { json: await downloadLcpl(source.url) },
      options
    )
  );

/**
 * Readium LCP for `react-native-readium`: initialize it, answer passphrase requests, acquire books
 * and manage their licenses. See {@link LcpModule} for every method.
 *
 * @example
 * ```ts
 * import { LCP } from 'react-native-readium-lcp';
 *
 * await LCP.initialize();
 * LCP.setAuthenticationHandler(({ hint }) => promptForPassphrase(hint));
 * const { localPath } = await LCP.acquirePublication({ url: lcplUrl });
 * ```
 *
 * @group Entry point
 */
export const LCP: LcpModule = {
  get capabilities() {
    return native().capabilities;
  },
  initialize: (options) => lcpCall(() => native().initialize(options)),
  setAuthenticationHandler: (handler) =>
    native().setAuthenticationHandler(handler),
  addPassphrase: (passphrase, options) =>
    lcpCall(() => native().addPassphrase(passphrase, options)),
  forgetPassphrases: () => lcpCall(() => native().forgetPassphrases()),
  acquirePublication,
  injectLicense: (licenseJSON, publicationPath) =>
    lcpCall(() => native().injectLicense(licenseJSON, publicationPath)),
  getLicense: (publicationPath, options) =>
    lcpCall(() => native().getLicense(publicationPath, options)),
  renewLoan: (publicationPath, options) =>
    lcpCall(() => native().renewLoan(publicationPath, options)),
  returnPublication: (publicationPath) =>
    lcpCall(() => native().returnPublication(publicationPath)),
};

/**
 * The API of {@link LCP}, the package's entry point: Readium LCP for `react-native-readium`.
 *
 * Every method rejects with an {@link LcpError}. Paths are absolute paths or `file://` URLs.
 *
 * @interface
 * @group Entry point
 */
export type LcpModule = Omit<
  ReadiumLCP,
  keyof HybridObject<{ ios: 'swift'; android: 'kotlin' }>
>;
