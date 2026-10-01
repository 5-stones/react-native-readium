import type { Link as SpecLink } from '../specs/ReadiumView.nitro';
import type { Link } from '../interfaces/Link';

/**
 * Reconstructs a nested Link tree from the flat array produced by the
 * native bridge. Each flat link carries `depth`, `hasChildren`,
 * `parentHref`, and `position` fields set by the native flattener.
 * The tree is built using `parentHref` to establish parent-child
 * relationships and `position` to order siblings.
 */
export function buildLinkTree(flatLinks: SpecLink[]): Link[] {
  // Index links by href for parent lookup
  const linksByHref = new Map<string, Link>();
  const positionOf = new Map<Link, number>();
  const root: Link[] = [];

  // First pass: create Link nodes (stripping bridge-internal fields)
  const nodes: { link: Link; parentHref?: string; position: number }[] = [];
  for (const flat of flatLinks) {
    const { depth: _d, hasChildren: _h, parentHref: _p, position: _pos, ...rest } = flat;
    const link: Link = { ...rest };
    linksByHref.set(link.href, link);
    positionOf.set(link, flat.position ?? 0);
    nodes.push({
      link,
      parentHref: flat.parentHref ?? undefined,
      position: flat.position ?? 0,
    });
  }

  // Second pass: attach children using parentHref, ordered by position
  for (const { link, parentHref } of nodes) {
    if (parentHref == null) {
      root.push(link);
    } else {
      const parent = linksByHref.get(parentHref);
      if (parent) {
        if (!parent.children) {
          parent.children = [];
        }
        parent.children.push(link);
      } else {
        // Orphan — parent not found, treat as top-level
        root.push(link);
      }
    }
  }

  // Sort children arrays by position
  const sortByPosition = (a: Link, b: Link) =>
    (positionOf.get(a) ?? 0) - (positionOf.get(b) ?? 0);

  root.sort(sortByPosition);

  const sortChildren = (links: Link[]) => {
    for (const link of links) {
      if (link.children) {
        link.children.sort(sortByPosition);
        sortChildren(link.children);
      }
    }
  };
  sortChildren(root);

  return root;
}
