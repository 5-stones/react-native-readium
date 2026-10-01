import type { HybridObject } from 'react-native-nitro-modules';

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

export type LcpAuthReason = 'passphraseNotFound' | 'invalidPassphrase';

export interface LcpLink {
  href: string;
  type?: string;
  title?: string;
}

/** Sent to the JS authentication handler when a license needs its passphrase. */
export interface LcpAuthRequest {
  reason: LcpAuthReason;
  licenseId: string;
  provider: string;
  /** The license's passphrase hint, e.g. "Your library card PIN". */
  hint: string;
  hintLink?: LcpLink;
  supportLinks: LcpLink[];
  userId?: string;
  userName?: string;
  userEmail?: string;
}

export interface LcpAcquiredPublication {
  /** The downloaded publication with its license injected; pass it to `<ReadiumView file>`. */
  localPath: string;
  suggestedFilename: string;
  licenseId: string;
}

export type LcpLicenseStatus =
  | 'ready'
  | 'active'
  | 'revoked'
  | 'returned'
  | 'cancelled'
  | 'expired';

export interface LcpLicenseInfo {
  id: string;
  provider: string;
  /** Milliseconds since the epoch, like every date here. */
  issued: number;
  updated: number;
  /** The loan window, when the license has one. */
  start?: number;
  end?: number;
  /** From the status document, when the license server was reachable. */
  status?: LcpLicenseStatus;
  /** Characters left to copy; absent when unlimited. */
  charactersToCopyLeft?: number;
  /** Pages left to print; absent when unlimited. */
  pagesToPrintLeft?: number;
  canRenewLoan: boolean;
  maxRenewDate?: number;
  canReturnPublication: boolean;
  /**
   * Why the book can't be read with this license, if it can't: e.g. `licenseRevoked`, or
   * `missingPassphrase` when the passphrase wasn't given. Undefined when it can be read.
   */
  restriction?: LcpErrorCode;
}

/** What this platform's Readium LCP module can do; not every API exists on both. */
export interface LcpCapabilities {
  /** `addPassphrase`: iOS only, as readium-lcp keeps Android's passphrase store internal. */
  addPassphrase: boolean;
  /** `forgetPassphrases`: iOS only, for the same reason. */
  forgetPassphrases: boolean;
}

/**
 * Native bridge to Readium LCP. Use the `LCP` object exported from the package,
 * which wraps this with Date conversion and typed errors.
 */
export interface ReadiumLCP
  extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  readonly capabilities: LcpCapabilities;

  /**
   * Builds the LCP service and registers its content protection with react-native-readium.
   * Resolves false when the liblcp binary isn't available to the app. Safe to call again.
   */
  initialize(options?: LcpInitOptions): Promise<boolean>;

  /**
   * Called when a license needs its passphrase and user interaction is allowed. Resolve
   * with the passphrase (cleartext or SHA-256 hex), or undefined to give up.
   */
  setAuthenticationHandler(
    handler: (request: LcpAuthRequest) => Promise<string | undefined>
  ): void;
  clearAuthenticationHandler(): void;

  /** Stores a passphrase so licenses it unlocks open without asking. iOS only. */
  addPassphrase(passphrase: string, isHashed: boolean): Promise<void>;

  /** Removes every stored passphrase, e.g. when the user signs out. iOS only. */
  forgetPassphrases(): Promise<void>;

  /**
   * Downloads the publication an LCPL points to and injects the license into it. With
   * `checkStatus`, a revoked, returned, cancelled or expired license is rejected first, so a
   * book its user can't read is never downloaded.
   */
  acquirePublicationFromFile(
    lcplPath: string,
    checkStatus: boolean,
    onProgress?: (fraction: number) => void
  ): Promise<LcpAcquiredPublication>;
  acquirePublicationFromJSON(
    lcplJSON: string,
    checkStatus: boolean,
    onProgress?: (fraction: number) => void
  ): Promise<LcpAcquiredPublication>;

  /** Injects a license into a publication the app downloaded itself. */
  injectLicense(licenseJSON: string, publicationPath: string): Promise<void>;

  /** Validates the license embedded in a local publication and describes it. */
  getLicense(
    publicationPath: string,
    allowUserInteraction: boolean
  ): Promise<LcpLicenseInfo>;

  /** Extends the loan, up to `preferredEndDate` when given. */
  renewLoan(
    publicationPath: string,
    preferredEndDate?: number
  ): Promise<LcpLicenseInfo>;

  returnPublication(publicationPath: string): Promise<void>;
}
