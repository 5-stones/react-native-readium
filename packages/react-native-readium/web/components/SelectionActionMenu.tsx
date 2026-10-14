import React from 'react';

import type { SelectionAction } from '../../src/interfaces';
import type { SelectionRect } from '../utils/selection';

interface Props {
  actions: SelectionAction[];
  rect: SelectionRect;
  /** The reader picked one. */
  onAction: (actionId: string) => void;
}

/** Height of the menu, used to decide whether it fits above the selection. */
const MENU_HEIGHT = 40;
/** How far from the selection it sits. */
const GAP = 8;

/**
 * The menu offered for a text selection, which the library draws on web.
 *
 * iOS and Android add `selectionActions` to the operating system's own
 * selection menu, and the system places and dismisses it. A browser offers
 * nothing equivalent — a selection inside the publication's frame has no
 * menu, and the browser's own context menu cannot be added to — so the items
 * would mean nothing here unless something rendered them. This is that
 * something, kept deliberately plain: labels, the way the system menus are.
 *
 * Above the selection where there is room, below it where there is not, which
 * is what a selection near the top of the page needs.
 */
export const SelectionActionMenu: React.FC<Props> = ({
  actions,
  rect,
  onAction,
}) => {
  if (!actions.length) return null;

  const fitsAbove = rect.y > MENU_HEIGHT + GAP;

  return (
    <div
      role="menu"
      aria-label="Selection actions"
      style={{
        position: 'absolute',
        top: fitsAbove
          ? rect.y - MENU_HEIGHT - GAP
          : rect.y + rect.height + GAP,
        left: rect.x + rect.width / 2,
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 4,
        padding: 4,
        borderRadius: 8,
        background: '#222',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
        zIndex: 1001,
        // The selection must survive the press, so the menu never takes it.
        userSelect: 'none',
      }}
      onMouseDown={(event) => event.preventDefault()}
    >
      {actions.map((action) => (
        <button
          key={action.id}
          role="menuitem"
          type="button"
          onClick={() => onAction(action.id)}
          style={{
            appearance: 'none',
            border: 'none',
            borderRadius: 6,
            background: 'transparent',
            color: '#fff',
            font: 'inherit',
            fontSize: 14,
            padding: '6px 10px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
};
