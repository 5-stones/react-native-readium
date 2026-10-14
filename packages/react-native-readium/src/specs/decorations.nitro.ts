/**
 * Annotations drawn over a publication, such as highlights, and what the
 * reader does with them.
 */

import type { Locator } from './locator.nitro';

// ── Decoration ───────────────────────────────────────────────────────────────

/** How a decoration looks. */
export interface DecorationStyle {
  /** `'highlight'` or `'underline'`. */
  type: string;
  /** Its color, as a CSS color. */
  tint?: string;
  isActive?: boolean;
  id?: string;
  html?: string;
  css?: string;
  layout?: string;
  width?: string;
}

/** One annotation rendered over the publication, such as a highlight. */
export interface Decoration {
  /** Your identifier for it, unique within its group. */
  id: string;
  /** Where it is. */
  locator: Locator;
  /** How it looks. */
  style: DecorationStyle;
  /** Your own data, such as a note or the selected text. */
  extras?: Record<string, string>;
}

/** A named set of decorations, such as `"highlights"`. */
export interface DecorationGroup {
  name: string;
  decorations: Decoration[];
}

/** Reported by `onDecorationActivated` when the user taps a decoration. */
/**
 * Where something is on screen, as reported with a tapped decoration below.
 *
 * Both come from the navigator unchanged, in the platform's own coordinates
 * relative to the reader — points on iOS, pixels on Android — so placing a
 * React Native view over them may mean converting first.
 */
export interface Rect {
  /** Distance from the reader's left edge to the rectangle's left edge. */
  x: number;
  /** Distance from the reader's top edge to the rectangle's top edge. */
  y: number;
  width: number;
  height: number;
}

/** A single position, in the same coordinates as {@link Rect}. */
export interface Point {
  x: number;
  y: number;
}

export interface DecorationActivatedEvent {
  /** The decoration tapped. */
  decoration: Decoration;
  /** The name of its group. */
  group: string;
  /** Where the decoration is, when the navigator reported it. */
  rect?: Rect;
  /** Where the reader tapped, when the navigator reported it. */
  point?: Point;
}
