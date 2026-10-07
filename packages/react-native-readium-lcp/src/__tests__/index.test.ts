const mockNative = {
  initialize: jest.fn(),
  setAuthenticationHandler: jest.fn(),
  getLicense: jest.fn(),
  acquirePublication: jest.fn(),
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
    expect(mockNative.acquirePublication).not.toHaveBeenCalled();
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

  it('passes the license native reports straight through', async () => {
    const nativeLicense = {
      id: 'l1',
      provider: 'p',
      issued: new Date(0),
      updated: new Date(1000),
      end: new Date(2000),
      canRenewLoan: true,
      canReturnPublication: false,
    };
    mockNative.getLicense.mockResolvedValue(nativeLicense);
    const options = { allowUserInteraction: false };
    await expect(LCP.getLicense('/book.epub', options)).resolves.toBe(
      nativeLicense
    );
    expect(mockNative.getLicense).toHaveBeenCalledWith('/book.epub', options);
  });

  it('hands the authentication handler to native, and removes it when omitted', () => {
    const handler = async () => undefined;
    LCP.setAuthenticationHandler(handler);
    expect(mockNative.setAuthenticationHandler).toHaveBeenLastCalledWith(
      handler
    );

    LCP.setAuthenticationHandler();
    expect(mockNative.setAuthenticationHandler).toHaveBeenLastCalledWith(
      undefined
    );
  });

  it('downloads a { url } license and hands native its JSON', async () => {
    mockNative.acquirePublication.mockResolvedValue({});
    (global as any).fetch = jest
      .fn()
      .mockResolvedValue({ ok: true, text: async () => '{"id":"l1"}' });
    await LCP.acquirePublication({ url: 'https://x/lcpl' });
    expect(mockNative.acquirePublication).toHaveBeenCalledWith(
      { json: '{"id":"l1"}' },
      undefined
    );

    await LCP.acquirePublication({ path: '/a.lcpl' });
    expect(mockNative.acquirePublication).toHaveBeenLastCalledWith(
      { path: '/a.lcpl' },
      undefined
    );
  });

  it('passes acquisition options to native, and its rejections back as LcpErrors', async () => {
    mockNative.acquirePublication.mockResolvedValue({});
    const options = { checkStatus: false, onProgress: jest.fn() };
    await LCP.acquirePublication({ path: '/a.lcpl' }, options);
    expect(mockNative.acquirePublication).toHaveBeenCalledWith(
      { path: '/a.lcpl' },
      options
    );

    mockNative.acquirePublication.mockRejectedValue(
      new Error('[licenseRevoked] revoked(2026-10-01)')
    );
    await expect(
      LCP.acquirePublication({ path: '/a.lcpl' })
    ).rejects.toMatchObject({ code: 'licenseRevoked' });
  });

  it("doesn't expose Nitro's HybridObject members", () => {
    expect('dispose' in LCP).toBe(false);
    // @ts-expect-error `dispose` would tear down the shared native module.
    expect(LCP.dispose).toBeUndefined();
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
