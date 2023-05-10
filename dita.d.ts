// import these types via a .d.ts file in order to avoid direct imports in files
// which causes issues in SSR contexts.
declare type D2Reader = import('@d-i-t-a/reader').default;
declare type R2Locator = import('@d-i-t-a/reader').Locator;
declare type D2UserSettings = import('@d-i-t-a/reader/dist/types/model/user-settings/UserSettings').UserSettings;
