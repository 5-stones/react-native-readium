import type { Link as SpecLink } from '../specs';
import type { Link } from '../interfaces/Link';

/**
 * Rebuilds the nested table of contents from the flat array the native
 * flatteners produce.
 *
 * They walk the tree depth first, so the array is already in document order
 * and a link's parent is the last one seen at the depth above it. That is what
 * this follows — not `parentHref`, which cannot tell two links to the same
 * place apart. Publications do that routinely: a part that links to its own
 * first chapter, a group named after the section it opens with. Keyed on href,
 * the second of the pair replaces the first, every one of its siblings is
 * reparented onto it, and it ends up as its own child — the whole level
 * collapses.
 */
export function buildLinkTree(flatLinks: SpecLink[]): Link[] {
  const root: Link[] = [];
  /** The ancestors of the link being read, by depth. */
  const open: Link[] = [];

  for (const flat of flatLinks) {
    const {
      depth,
      hasChildren: _hasChildren,
      parentHref: _parentHref,
      position: _position,
      ...rest
    } = flat;
    const link: Link = { ...rest };
    const level = Math.max(0, Math.round(depth ?? 0));

    const parent = level > 0 ? open[level - 1] : undefined;
    if (parent) {
      if (!parent.children) parent.children = [];
      parent.children.push(link);
    } else {
      // Depth 0, or a depth that skipped a level and so has no parent to
      // attach to. Better at the top than dropped.
      root.push(link);
    }

    // Anything deeper than this link is closed by it.
    open.length = level;
    open[level] = link;
  }

  return root;
}
