import { buildLinkTree } from '../buildLinkTree';
import type { Link as SpecLink } from '../../specs';

/** As the native flatteners emit them: depth first, in document order. */
const flat = (
  entries: Array<[href: string, depth: number, parentHref?: string]>
): SpecLink[] =>
  entries.map(([href, depth, parentHref], index) => ({
    href,
    title: href,
    depth,
    parentHref,
    position: index,
    hasChildren: false,
  }));

describe('buildLinkTree', () => {
  it('nests by depth and keeps document order', () => {
    const tree = buildLinkTree(
      flat([
        ['part-1', 0],
        ['ch-1', 1, 'part-1'],
        ['ch-2', 1, 'part-1'],
        ['part-2', 0],
        ['ch-3', 1, 'part-2'],
      ])
    );

    expect(tree.map((link) => link.href)).toEqual(['part-1', 'part-2']);
    expect(tree[0].children?.map((link) => link.href)).toEqual([
      'ch-1',
      'ch-2',
    ]);
    expect(tree[1].children?.map((link) => link.href)).toEqual(['ch-3']);
  });

  /**
   * A group named after the section it opens with links to the same place as
   * its own first child. Keyed on href, that child replaced its parent and
   * the level collapsed.
   */
  it('keeps the tree when a parent and a child link to the same place', () => {
    const tree = buildLinkTree(
      flat([
        ['front', 0],
        ['q.xhtml#q1', 0, undefined],
        ['q.xhtml#q1', 1, 'q.xhtml#q1'],
        ['q.xhtml#q2', 1, 'q.xhtml#q1'],
        ['q.xhtml#q3', 1, 'q.xhtml#q1'],
      ])
    );

    expect(tree).toHaveLength(2);
    const group = tree[1];
    expect(group.children?.map((link) => link.href)).toEqual([
      'q.xhtml#q1',
      'q.xhtml#q2',
      'q.xhtml#q3',
    ]);
    // Nothing is its own child.
    expect(group.children).not.toContain(group);
  });

  it('nests three levels deep', () => {
    const tree = buildLinkTree(
      flat([
        ['a', 0],
        ['b', 1, 'a'],
        ['c', 2, 'b'],
        ['d', 1, 'a'],
      ])
    );

    expect(tree[0].children?.[0].children?.[0].href).toBe('c');
    expect(tree[0].children?.map((link) => link.href)).toEqual(['b', 'd']);
  });

  it('closes deeper levels when the depth drops', () => {
    const tree = buildLinkTree(
      flat([
        ['a', 0],
        ['a1', 1, 'a'],
        ['a1i', 2, 'a1'],
        ['b', 0],
        ['b1', 1, 'b'],
      ])
    );

    expect(tree.map((link) => link.href)).toEqual(['a', 'b']);
    expect(tree[1].children?.map((link) => link.href)).toEqual(['b1']);
  });

  it('keeps a link whose depth skipped a level rather than dropping it', () => {
    const tree = buildLinkTree(flat([['orphan', 2, 'missing']]));

    expect(tree.map((link) => link.href)).toEqual(['orphan']);
  });

  it('leaves children undefined where there are none', () => {
    const [link] = buildLinkTree(flat([['only', 0]]));

    expect(link.children).toBeUndefined();
  });

  it('drops the fields that only exist for the bridge', () => {
    const [link] = buildLinkTree(flat([['a', 0]]));

    expect(link).not.toHaveProperty('depth');
    expect(link).not.toHaveProperty('parentHref');
    expect(link).not.toHaveProperty('position');
    expect(link).not.toHaveProperty('hasChildren');
  });
});
