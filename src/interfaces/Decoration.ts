import { Locator } from './Locator';

/**
 * Base interface for all decoration styles
 */
export interface DecorationStyle {
  type: 'highlight' | 'underline' | 'custom';
}

/**
 * Highlight decoration style with color and optional activation state
 */
export interface HighlightStyle extends DecorationStyle {
  type: 'highlight';
  /**
   * The color of the highlight (CSS color: hex, rgb, rgba, or named color)
   */
  tint: string;
  /**
   * Whether the highlight shows an activation state when tapped
   */
  isActive?: boolean;
}

/**
 * Underline decoration style with color and optional activation state
 */
export interface UnderlineStyle extends DecorationStyle {
  type: 'underline';
  /**
   * The color of the underline (CSS color: hex, rgb, rgba, or named color)
   */
  tint: string;
  /**
   * Whether the underline shows an activation state when tapped
   */
  isActive?: boolean;
}

/**
 * Custom decoration style with HTML template and CSS
 */
export interface CustomStyle extends DecorationStyle {
  type: 'custom';
  /**
   * Unique identifier for this custom style
   */
  id: string;
  /**
   * HTML template for the decoration element
   * Can include placeholders like {{extras.fieldName}}
   */
  html: string;
  /**
   * Optional CSS stylesheet to apply
   */
  css?: string;
  /**
   * Layout mode for the decoration
   * - bounds: Single element covering the entire text range
   * - boxes: One element per line of text
   */
  layout?: 'bounds' | 'boxes';
  /**
   * Width behavior for the decoration element
   * - wrap: Wraps the text content
   * - bounds: Covers the bounding box of the text
   * - viewport: Spans the viewport width
   * - page: Spans the page width
   */
  width?: 'wrap' | 'bounds' | 'viewport' | 'page';
}

/**
 * Union type of all decoration styles
 */
export type DecorationStyleType = HighlightStyle | UnderlineStyle | CustomStyle;

/**
 * A single decoration in the publication
 */
export interface Decoration {
  /**
   * Unique identifier for this decoration
   */
  id: string;
  /**
   * The location of the decoration in the publication
   */
  locator: Locator;
  /**
   * The visual style of the decoration
   */
  style: DecorationStyleType;
  /**
   * Optional application-specific metadata
   * Can be used to store notes, timestamps, user info, etc.
   */
  extras?: { [key: string]: any };
}

/**
 * Decorations organized by group name
 * Common groups: 'highlights', 'search', 'tts', 'pageNumbers'
 */
export type DecorationGroups = {
  [groupName: string]: Decoration[];
};

/**
 * Event emitted when a decoration is activated (tapped/clicked)
 */
export interface DecorationActivatedEvent {
  /**
   * The decoration that was activated
   */
  decoration: Decoration;
  /**
   * The group this decoration belongs to
   */
  group: string;
  /**
   * The bounding rectangle of the decoration element
   */
  rect?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  /**
   * The point where the user tapped/clicked
   */
  point?: {
    x: number;
    y: number;
  };
}
