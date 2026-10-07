import type { HybridObject } from 'react-native-nitro-modules';

/** Options for `LCP.initialize`. */
export interface LcpInitOptions {
  /** Shown to the license server when this device registers a license. */
  deviceName?: string;
  /** Must be stable across launches. Generated and persisted when omitted. */
  deviceId?: string;
}

/**
 * Why an LCP call failed: the `code` of an `LcpError`. Native code reports these by name, so
 * the generated native enums keep both platforms to the same set.
 */
export type LcpErrorCode =
  | 'notInitialized'
  | 'registryUnavailable'
  | 'unsupported'
  | 'openFailed'
  | 'missingPassphrase'
  | 'addPassphraseFailed'
  | 'forgetPassphrasesFailed'
  | 'notALicenseDocument'
  | 'licenseIsBusy'
  | 'licenseIntegrity'
  | 'licenseCancelled'
  | 'licenseReturned'
  | 'licenseNotStarted'
  | 'licenseExpired'
  | 'licenseRevoked'
  | 'licenseContainer'
  | 'licenseInteractionNotAvailable'
  | 'licenseProfileNotSupported'
  | 'invalidRenewalPeriod'
  | 'renewFailed'
  | 'alreadyReturnedOrExpired'
  | 'returnFailed'
  | 'crlFetching'
  | 'parsing'
  | 'network'
  | 'unknown';

/**
 * Why a passphrase is requested: none is stored for the license (`passphraseNotFound`), or the
 * last one given was wrong (`invalidPassphrase`).
 */
export type LcpAuthReason = 'passphraseNotFound' | 'invalidPassphrase';

/** A link from a license, e.g. to its passphrase hint or its provider's support page. */
export interface LcpLink {
  href: string;
  type?: string;
  title?: string;
}

/** Sent to the JS authentication handler when a license needs its passphrase. */
export interface LcpAuthRequest {
  reason: LcpAuthReason;
  /** The license needing its passphrase. */
  licenseId: string;
  /** Who issued the license, as a URI. */
  provider: string;
  /** The license's passphrase hint, e.g. "Your library card PIN". */
  hint: string;
  /** A page explaining the hint. */
  hintLink?: LcpLink;
  /** The provider's support pages. */
  supportLinks: LcpLink[];
  /** The license holder, when the license says. */
  userId?: string;
  userName?: string;
  userEmail?: string;
}

/** A publication downloaded by `LCP.acquirePublication`. */
export interface LcpAcquiredPublication {
  /**
   * The downloaded publication with its license injected, in a temporary location: move it
   * where your app keeps books, and pass that path to `<ReadiumView file>`.
   */
  localPath: string;
  /** A file name for the publication, from its license, e.g. `moby-dick.epub`. */
  suggestedFilename: string;
  /** The license's identifier. */
  licenseId: string;
}

/** A license's status, as its license server reports it. */
export type LcpLicenseStatus =
  | 'ready'
  | 'active'
  | 'revoked'
  | 'returned'
  | 'cancelled'
  | 'expired';

/** A publication's license, as `LCP.getLicense` and `LCP.renewLoan` report it. */
export interface LcpLicense {
  /** The license's identifier. */
  id: string;
  /** Who issued the license, as a URI. */
  provider: string;
  /** When the license was issued. */
  issued: Date;
  /** When the license was last updated, e.g. by a renewal. */
  updated: Date;
  /** When the loan starts, for a license with a loan window. */
  start?: Date;
  /** When the loan ends, for a license with a loan window. */
  end?: Date;
  /** The license's status, from its license server, when it was reachable. */
  status?: LcpLicenseStatus;
  /** Characters left to copy; undefined when unlimited. */
  charactersToCopyLeft?: number;
  /** Pages left to print; undefined when unlimited. */
  pagesToPrintLeft?: number;
  /** Whether `LCP.renewLoan` can extend the loan. */
  canRenewLoan: boolean;
  /** The latest end date a renewal can ask for, when the provider sets one. */
  maxRenewDate?: Date;
  /** Whether `LCP.returnPublication` can return the book. */
  canReturnPublication: boolean;
  /**
   * Why the book can't be read with this license, if it can't: e.g. `licenseRevoked`, or
   * `missingPassphrase` when the passphrase wasn't given. Undefined when it can be read. See
   * `describeLcpError` for a message.
   */
  restriction?: LcpErrorCode;
}

/** Options for `LCP.acquirePublication`. */
export interface AcquirePublicationOptions {
  /** Called as the publication downloads, with the fraction done, from 0 to 1. */
  onProgress?: (fraction: number) => void;
  /**
   * Asks the license server for the license's status first, and rejects a revoked, returned,
   * cancelled or expired license before downloading anything. Costs one request.
   * @defaultValue true
   */
  checkStatus?: boolean;
}

/** Options for `LCP.getLicense`. */
export interface GetLicenseOptions {
  /**
   * Whether the authentication handler may be asked for the passphrase. When false, a license
   * whose passphrase isn't stored is still described, with `restriction: 'missingPassphrase'`.
   * @defaultValue true
   */
  allowUserInteraction?: boolean;
}

/** Options for `LCP.renewLoan`. */
export interface RenewLoanOptions {
  /**
   * The end date to ask for, up to the license's `maxRenewDate`. When omitted, the provider
   * picks it.
   */
  preferredEndDate?: Date;
}

/** Options for `LCP.addPassphrase`. */
export interface AddPassphraseOptions {
  /**
   * Whether `passphrase` is already the SHA-256 hex hash of the passphrase.
   * @defaultValue false
   */
  isHashed?: boolean;
}

/** What this platform's Readium LCP module can do; not every API exists on both. */
export interface LcpCapabilities {
  /** `addPassphrase`: iOS only, as readium-lcp keeps Android's passphrase store internal. */
  addPassphrase: boolean;
  /** `forgetPassphrases`: iOS only, for the same reason. */
  forgetPassphrases: boolean;
}

/**
 * Where to find a license document (`.lcpl`). Set exactly one field.
 */
export interface LcplSource {
  /** A local `.lcpl` file: an absolute path or a `file://` URL. */
  path?: string;
  /** The license document's contents. */
  json?: string;
  /** A URL to download the license document from. */
  url?: string;
}

/**
 * Answers a passphrase request; see `LCP.setAuthenticationHandler`. Resolve with the passphrase,
 * in clear text or as its SHA-256 hex hash, or `undefined` to give up.
 */
export type LcpAuthHandler = (
  request: LcpAuthRequest
) => Promise<string | undefined>;

/**
 * The native module behind `LCP`, whose type, `LcpModule`, is this minus Nitro's plumbing. The
 * public API's documentation lives here, on its members.
 *
 * @internal
 */
export interface ReadiumLCP
  extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  /**
   * What this platform supports, e.g. to hide a "Forget passphrases" button where it can't work.
   */
  readonly capabilities: LcpCapabilities;

  /**
   * Builds the LCP service and registers it with `react-native-readium`. Call it once, at
   * startup, and wait for it before giving a `ReadiumView` an LCP book. Safe to call again.
   *
   * @returns false when the app was built without liblcp, so LCP isn't available.
   * @example
   * ```ts
   * const available = await LCP.initialize({ deviceName: 'My phone' });
   * ```
   */
  initialize(options?: LcpInitOptions): Promise<boolean>;

  /**
   * Answers passphrase requests from JS, while a book opens or a license is read. Without a
   * handler, a license whose passphrase isn't already stored fails to open.
   *
   * The handler's promise must always settle: resolve `undefined` when the user cancels, when a
   * newer request replaces the prompt, or when the prompt's screen goes away. Readium waits on it.
   *
   * @param handler The handler; omit it to remove the current one.
   * @example
   * ```ts
   * LCP.setAuthenticationHandler(async ({ reason, hint }) =>
   *   promptForPassphrase({ hint, wrong: reason === 'invalidPassphrase' })
   * );
   * ```
   */
  setAuthenticationHandler(handler?: LcpAuthHandler): void;

  /**
   * Stores a passphrase, so licenses it unlocks open without asking.
   *
   * @platform iOS. Rejects with `unsupported` on Android, where readium-lcp keeps its passphrase
   *   store internal; check `capabilities`.
   */
  addPassphrase(
    passphrase: string,
    options?: AddPassphraseOptions
  ): Promise<void>;

  /**
   * Removes every stored passphrase, so each license asks again: for signing out or switching
   * users. Licenses and their consumed print and copy rights are kept.
   *
   * @platform iOS. Rejects with `unsupported` on Android; check `capabilities`.
   */
  forgetPassphrases(): Promise<void>;

  /**
   * Downloads the publication a license points to, and injects the license into it.
   *
   * @param source The license: `{ url }` to download it, `{ path }` to a local `.lcpl`, or
   *   `{ json }` with its contents.
   * @returns The downloaded publication, in a temporary location: move it where your app keeps
   *   books.
   * @throws `LcpError` `licenseRevoked`, `licenseExpired`, … for a license that can't be used,
   *   `network` when a download fails.
   * @example
   * ```ts
   * const { localPath } = await LCP.acquirePublication(
   *   { url: lcplUrl },
   *   { onProgress: setProgress }
   * );
   * ```
   */
  acquirePublication(
    source: LcplSource,
    options?: AcquirePublicationOptions
  ): Promise<LcpAcquiredPublication>;

  /**
   * Injects a license into a publication the app downloaded itself.
   *
   * @param licenseJSON The license document (`.lcpl`) contents.
   * @param publicationPath The publication to inject it into.
   */
  injectLicense(licenseJSON: string, publicationPath: string): Promise<void>;

  /**
   * Reads and validates the license in a local publication: its loan, rights and status. May
   * call the authentication handler for the passphrase.
   *
   * @returns The license, with `restriction` set when the book can't be read with it.
   */
  getLicense(
    publicationPath: string,
    options?: GetLicenseOptions
  ): Promise<LcpLicense>;

  /**
   * Extends the loan, when the license's `canRenewLoan` is true.
   *
   * @returns The updated license.
   * @throws `LcpError` `invalidRenewalPeriod` for an end date past `maxRenewDate`; `renewFailed`
   *   when the provider refuses, including loans it only renews on its web page.
   */
  renewLoan(
    publicationPath: string,
    options?: RenewLoanOptions
  ): Promise<LcpLicense>;

  /**
   * Returns the book to its provider, ending the loan, when the license's `canReturnPublication`
   * is true.
   *
   * @throws `LcpError` `alreadyReturnedOrExpired`, or `returnFailed`.
   */
  returnPublication(publicationPath: string): Promise<void>;
}
