import { NitroModules } from 'react-native-nitro-modules';

import type {
  LcpAcquiredPublication,
  LcpCapabilities,
  LcpAuthRequest,
  LcpErrorCode,
  LcpInitOptions,
  LcpLicenseInfo,
  LcpLicenseStatus,
  ReadiumLCP,
} from './specs/ReadiumLCP.nitro';

export type {
  LcpAcquiredPublication,
  LcpCapabilities,
  LcpAuthReason,
  LcpErrorCode,
  LcpAuthRequest,
  LcpInitOptions,
  LcpLicenseStatus,
  LcpLink,
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

/** A user-facing English message for an error. */
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

/** Resolve with the passphrase (cleartext or SHA-256 hex), or null to give up. */
export type LcpAuthHandler = (
  request: LcpAuthRequest
) => Promise<string | null | undefined>;

export type LcplSource = { path: string } | { json: string } | { url: string };

export interface LcpLicense {
  id: string;
  provider: string;
  issued: Date;
  updated: Date;
  start?: Date;
  end?: Date;
  status?: LcpLicenseStatus;
  /** Characters left to copy; undefined when unlimited. */
  charactersToCopyLeft?: number;
  /** Pages left to print; undefined when unlimited. */
  pagesToPrintLeft?: number;
  canRenewLoan: boolean;
  maxRenewDate?: Date;
  canReturnPublication: boolean;
  /** Why the book can't be read with this license, if it can't; see `describeLcpError`. */
  restriction?: LcpErrorCode;
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

const bridged = async <T>(call: () => Promise<T>): Promise<T> => {
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

const toDate = (millis?: number) =>
  millis === undefined ? undefined : new Date(millis);

const toLicense = (info: LcpLicenseInfo): LcpLicense => ({
  ...info,
  issued: new Date(info.issued),
  updated: new Date(info.updated),
  start: toDate(info.start),
  end: toDate(info.end),
  maxRenewDate: toDate(info.maxRenewDate),
});

export const LCP = {
  /** What this platform supports, e.g. to hide a "Forget passphrases" button where it can't work. */
  get capabilities(): LcpCapabilities {
    return native().capabilities;
  },

  /**
   * Builds the LCP service and registers it with react-native-readium. Resolves false when the
   * app doesn't ship liblcp. Must resolve before a `ReadiumView` is given an LCP `file`.
   */
  initialize(options?: LcpInitOptions): Promise<boolean> {
    return bridged(() => native().initialize(options));
  },

  /**
   * Answers passphrase requests from JS. Without a handler, a license whose passphrase isn't
   * already stored fails to open.
   */
  setAuthenticationHandler(handler: LcpAuthHandler | null): void {
    if (!handler) {
      native().clearAuthenticationHandler();
      return;
    }
    native().setAuthenticationHandler(
      async (request) => (await handler(request)) ?? undefined
    );
  },

  /** Stores a passphrase so licenses it unlocks open without asking. iOS only. */
  addPassphrase(
    passphrase: string,
    options: { isHashed?: boolean } = {}
  ): Promise<void> {
    return bridged(() =>
      native().addPassphrase(passphrase, options.isHashed ?? false)
    );
  },

  /**
   * Removes every stored passphrase, so each license asks again; for signing out or switching
   * users. Licenses and their consumed print/copy rights are kept. iOS only: rejects with
   * `unsupported` on Android, where readium-lcp 3.3 keeps its passphrase store internal.
   */
  forgetPassphrases(): Promise<void> {
    return bridged(() => native().forgetPassphrases());
  },

  /** Downloads the publication an LCPL points to and injects the license into it. */
  async acquirePublication(
    lcpl: LcplSource,
    options: {
      onProgress?: (fraction: number) => void;
      /**
       * Rejects a revoked, returned, cancelled or expired license before downloading anything,
       * at the cost of one request to the license server. Defaults to true.
       */
      checkStatus?: boolean;
    } = {}
  ): Promise<LcpAcquiredPublication> {
    const { onProgress } = options;
    const checkStatus = options.checkStatus ?? true;
    if ('path' in lcpl) {
      return bridged(() =>
        native().acquirePublicationFromFile(lcpl.path, checkStatus, onProgress)
      );
    }
    const json = 'json' in lcpl ? lcpl.json : await downloadLcpl(lcpl.url);
    return bridged(() =>
      native().acquirePublicationFromJSON(json, checkStatus, onProgress)
    );
  },

  /** Injects a license into a publication the app downloaded itself. */
  injectLicense(licenseJSON: string, publicationPath: string): Promise<void> {
    return bridged(() => native().injectLicense(licenseJSON, publicationPath));
  },

  /** Validates the license in a local publication; may call the authentication handler. */
  async getLicense(
    publicationPath: string,
    options: { allowUserInteraction?: boolean } = {}
  ): Promise<LcpLicense> {
    const info = await bridged(() =>
      native().getLicense(publicationPath, options.allowUserInteraction ?? true)
    );
    return toLicense(info);
  },

  async renewLoan(
    publicationPath: string,
    options: { preferredEndDate?: Date } = {}
  ): Promise<LcpLicense> {
    const info = await bridged(() =>
      native().renewLoan(publicationPath, options.preferredEndDate?.getTime())
    );
    return toLicense(info);
  },

  returnPublication(publicationPath: string): Promise<void> {
    return bridged(() => native().returnPublication(publicationPath));
  },
};
