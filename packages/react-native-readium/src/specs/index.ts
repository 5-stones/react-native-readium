/**
 * Everything the view's spec declares, in one import.
 *
 * The declarations are split by concern across `*.nitro.ts` files — nitrogen
 * only loads files named that way, so the split has to follow that rule — and
 * this re-exports them so the rest of the library has a single place to import
 * from. It is not itself a spec: nothing is generated from it.
 */

export type * from './decorations.nitro';
export type * from './errors.nitro';
export type * from './locator.nitro';
export type * from './metadata.nitro';
export type * from './preferences.nitro';
export type * from './ReadiumView.nitro';
export type * from './search.nitro';
export type * from './selection.nitro';
export type * from './source.nitro';
