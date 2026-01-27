import React, {
  useCallback,
  useState,
  useEffect,
  forwardRef,
  useRef,
  useMemo,
} from 'react';
import { View, Platform, StyleSheet } from 'react-native';

import type {
  BaseReadiumViewProps,
  Dimensions,
  Preferences,
  DecorationGroups,
  SelectionAction,
} from '../interfaces';
import { getWidthOrHeightValue as dimension } from '../utils';
import { BaseReadiumView } from './BaseReadiumView';
import { Commands } from '../ReadiumViewNativeComponent';

export type ReadiumProps = Omit<
  BaseReadiumViewProps,
  'preferences' | 'decorations' | 'selectionActions'
> & {
  preferences: Preferences;
  decorations?: DecorationGroups;
  selectionActions?: SelectionAction[];
};

export const ReadiumView: React.FC<ReadiumProps> = forwardRef(
  (
    {
      onLocationChange: wrappedOnLocationChange,
      onPublicationReady: wrappedOnPublicationReady,
      onDecorationActivated: wrappedOnDecorationActivated,
      onSelectionChange: wrappedOnSelectionChange,
      onSelectionAction: wrappedOnSelectionAction,
      preferences,
      decorations,
      selectionActions,
      ...props
    },
    forwardedRef
  ) => {
    const defaultRef = useRef<any>(null);
    const [{ height, width }, setDimensions] = useState<Dimensions>({
      width: 0,
      height: 0,
    });

    // set the view dimensions on layout
    const onLayout = useCallback(
      ({
        nativeEvent: {
          layout: { width: layoutWidth, height: layoutHeight },
        },
      }: any) => {
        setDimensions({
          width: dimension(layoutWidth),
          height: dimension(layoutHeight),
        });
      },
      []
    );

    // wrap the native onLocationChange and extract the raw event value
    const onLocationChange = useCallback(
      (event: any) => {
        if (wrappedOnLocationChange) {
          wrappedOnLocationChange(event.nativeEvent);
        }
      },
      [wrappedOnLocationChange]
    );

    const onPublicationReady = useCallback(
      (event: any) => {
        if (wrappedOnPublicationReady) {
          wrappedOnPublicationReady(event.nativeEvent);
        }
      },
      [wrappedOnPublicationReady]
    );

    const onDecorationActivated = useCallback(
      (event: any) => {
        if (wrappedOnDecorationActivated) {
          wrappedOnDecorationActivated(event.nativeEvent);
        }
      },
      [wrappedOnDecorationActivated]
    );

    const onSelectionChange = useCallback(
      (event: any) => {
        if (wrappedOnSelectionChange) {
          wrappedOnSelectionChange(event.nativeEvent);
        }
      },
      [wrappedOnSelectionChange]
    );

    const onSelectionAction = useCallback(
      (event: any) => {
        if (wrappedOnSelectionAction) {
          wrappedOnSelectionAction(event.nativeEvent);
        }
      },
      [wrappedOnSelectionAction]
    );

    // create the view fragment on android
    useEffect(() => {
      if (Platform.OS === 'android' && defaultRef.current) {
        Commands.create(defaultRef.current);
      }
    }, []);

    // assign the forwarded ref
    const hasDefaultRef = defaultRef.current !== null;
    useEffect(() => {
      if (forwardedRef && 'current' in forwardedRef) {
        forwardedRef.current = defaultRef.current;
      } else if (forwardedRef) {
        forwardedRef(defaultRef);
      }
    }, [forwardedRef, hasDefaultRef, defaultRef]);

    const stringifiedPreferences = useMemo(
      () => JSON.stringify(preferences),
      [preferences]
    );

    const stringifiedDecorations = useMemo(
      () => (decorations ? JSON.stringify(decorations) : undefined),
      [decorations]
    );

    const stringifiedSelectionActions = useMemo(
      () => (selectionActions ? JSON.stringify(selectionActions) : undefined),
      [selectionActions]
    );

    return (
      <View style={styles.container} onLayout={onLayout}>
        <BaseReadiumView
          height={height}
          width={width}
          {...props}
          preferences={stringifiedPreferences}
          decorations={stringifiedDecorations}
          selectionActions={stringifiedSelectionActions}
          onLocationChange={onLocationChange}
          onPublicationReady={onPublicationReady}
          onDecorationActivated={onDecorationActivated}
          onSelectionChange={onSelectionChange}
          onSelectionAction={onSelectionAction}
          ref={defaultRef}
        />
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: { width: '100%', height: '100%' },
});
