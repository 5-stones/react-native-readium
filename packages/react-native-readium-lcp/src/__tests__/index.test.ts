const mockNative = {
  initialize: jest.fn(),
  setAuthenticationHandler: jest.fn(),
  clearAuthenticationHandler: jest.fn(),
  getLicense: jest.fn(),
  acquirePublicationFromFile: jest.fn(),
  acquirePublicationFromJSON: jest.fn(),
  forgetPassphrases: jest.fn(),
};

jest.mock('react-native-nitro-modules', () => ({
  NitroModules: { createHybridObject: () => mockNative },
}));

import { LCP, LcpError } from '../index';

describe('LCP', () => {
  beforeEach(() => jest.clearAllMocks());

  it('turns a coded native rejection into a readable LcpError', async () => {
    const revokedOn = Date.UTC(2026, 9, 1);
    mockNative.initialize.mockRejectedValue(
      new Error(
        `[licenseRevoked] ${JSON.stringify({
          detail: 'licenseStatus(revoked(...))',
          date: revokedOn,
          devicesCount: 2,
        })}`
      )
    );
    const error = await LCP.initialize().catch((e) => e);
    expect(error).toBeInstanceOf(LcpError);
    expect(error.code).toBe('licenseRevoked');
    expect(error.date).toEqual(new Date(revokedOn));
    expect(error.devicesCount).toBe(2);
    expect(error.detail).toBe('licenseStatus(revoked(...))');
    expect(error.message).toMatch(
      /^This license was revoked by its provider on .+\. It had been registered on 2 devices\.$/
    );
  });

  it("maps Kotlin's uppercased codes to the spec's names", async () => {
    mockNative.initialize.mockRejectedValue(
      new Error('[LICENSEREVOKED] {"detail":"revoked"}')
    );
    const error = await LCP.initialize().catch((e) => e);
    expect(error.code).toBe('licenseRevoked');

    mockNative.initialize.mockRejectedValue(new Error('[SOMETHINGNEW] {}'));
    expect((await LCP.initialize().catch((e) => e)).code).toBe('unknown');
  });

  it('finds the code and JSON inside the text Nitro rejects with', async () => {
    mockNative.initialize.mockRejectedValue(
      new Error(
        // fbjni's text for a Kotlin exception: its whole stack trace.
        'com.margelo.nitro.reactnativereadiumlcp.LcpBridgeException: [LICENSEEXPIRED] {"detail":"expired","date":0}\n' +
          '\tat com.margelo.nitro.reactnativereadiumlcp.HybridReadiumLCP$getLicense$1.invokeSuspend(HybridReadiumLCP.kt:42)\n' +
          '\tat kotlin.coroutines.jvm.internal.BaseContinuationImpl.resumeWith(Unknown Source) {suspended}'
      )
    );
    const error = await LCP.initialize().catch((e) => e);
    expect(error).toBeInstanceOf(LcpError);
    expect(error.code).toBe('licenseExpired');
    expect(error.date).toEqual(new Date(0));
    expect(error.message).toMatch(/^This license expired on /);
  });

  it('turns a failed LCPL download into a network LcpError', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: false, status: 404 });
    (global as any).fetch = fetchMock;
    const error = await LCP.acquirePublication({ url: 'https://x/lcpl' }).catch(
      (e) => e
    );
    expect(error).toBeInstanceOf(LcpError);
    expect(error.code).toBe('network');
    expect(error.detail).toBe('https://x/lcpl answered HTTP 404');
    expect(mockNative.acquirePublicationFromJSON).not.toHaveBeenCalled();
  });

  it('keeps a plain-text native detail when there is no JSON', async () => {
    mockNative.initialize.mockRejectedValue(
      new Error('[unsupported] forgetPassphrases is not available on Android.')
    );
    const error = await LCP.initialize().catch((e) => e);
    expect(error.code).toBe('unsupported');
    expect(error.message).toBe(
      'forgetPassphrases is not available on Android.'
    );
  });

  it('passes an uncoded rejection through unchanged', async () => {
    const original = new Error('boom');
    mockNative.initialize.mockRejectedValue(original);
    await expect(LCP.initialize()).rejects.toBe(original);
  });

  it('converts license dates and leaves unlimited rights undefined', async () => {
    mockNative.getLicense.mockResolvedValue({
      id: 'l1',
      provider: 'p',
      issued: 0,
      updated: 1000,
      end: 2000,
      canRenewLoan: true,
      canReturnPublication: false,
    });
    const license = await LCP.getLicense('/book.epub');
    expect(mockNative.getLicense).toHaveBeenCalledWith('/book.epub', true);
    expect(license.issued).toEqual(new Date(0));
    expect(license.end).toEqual(new Date(2000));
    expect(license.start).toBeUndefined();
    expect(license.charactersToCopyLeft).toBeUndefined();
  });

  it('maps a null handler answer to undefined for native', async () => {
    LCP.setAuthenticationHandler(async () => null);
    const wrapped = mockNative.setAuthenticationHandler.mock.calls[0][0];
    await expect(
      wrapped({ reason: 'passphraseNotFound' })
    ).resolves.toBeUndefined();

    LCP.setAuthenticationHandler(null);
    expect(mockNative.clearAuthenticationHandler).toHaveBeenCalled();
  });

  it('routes each LCPL source to the right native call', async () => {
    mockNative.acquirePublicationFromFile.mockResolvedValue({});
    mockNative.acquirePublicationFromJSON.mockResolvedValue({});
    await LCP.acquirePublication({ path: '/a.lcpl' });
    await LCP.acquirePublication({ json: '{}' });
    expect(mockNative.acquirePublicationFromFile).toHaveBeenCalledWith(
      '/a.lcpl',
      true,
      undefined
    );
    expect(mockNative.acquirePublicationFromJSON).toHaveBeenCalledWith(
      '{}',
      true,
      undefined
    );
  });

  it('checks the license status before acquiring unless told not to', async () => {
    mockNative.acquirePublicationFromFile.mockResolvedValue({});
    await LCP.acquirePublication({ path: '/a.lcpl' }, { checkStatus: false });
    expect(mockNative.acquirePublicationFromFile).toHaveBeenCalledWith(
      '/a.lcpl',
      false,
      undefined
    );

    mockNative.acquirePublicationFromFile.mockRejectedValue(
      new Error('[licenseRevoked] revoked(2026-10-01)')
    );
    await expect(
      LCP.acquirePublication({ path: '/a.lcpl' })
    ).rejects.toMatchObject({ code: 'licenseRevoked' });
  });

  it('reports forgetPassphrases as unsupported where the platform lacks it', async () => {
    mockNative.forgetPassphrases.mockRejectedValue(
      new Error('[unsupported] forgetPassphrases is not available on Android.')
    );
    await expect(LCP.forgetPassphrases()).rejects.toMatchObject({
      code: 'unsupported',
    });
  });
});
