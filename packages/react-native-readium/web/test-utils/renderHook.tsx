import React from 'react';
import { act, create } from 'react-test-renderer';

/**
 * Renders a hook so its return value can be observed and its effects run.
 *
 * `react-test-renderer` is already resolvable and the `react-native` preset
 * compiles TSX, so hook behaviour is testable without jsdom or a testing
 * library — which neither this package nor the workspace provides.
 */
export const renderHook = <P, T>(use: (props: P) => T, initial: P) => {
  let current!: T;

  const Probe = ({ props }: { props: P }) => {
    current = use(props);
    return null;
  };

  let root: ReturnType<typeof create>;
  act(() => {
    root = create(<Probe props={initial} />);
  });

  return {
    get: () => current,
    /** Re-renders with new props, flushing effects. */
    setProps: async (props: P) => {
      await act(async () => {
        root.update(<Probe props={props} />);
      });
    },
    /** Lets queued effects and promises settle. */
    settle: async (turns = 6) => {
      for (let i = 0; i < turns; i++) {
        await act(async () => {
          await Promise.resolve();
        });
      }
    },
    unmount: () => act(() => root.unmount()),
  };
};
