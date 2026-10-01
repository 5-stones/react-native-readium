import { useEffect, useState } from 'react';
import { EpubNavigator } from '@readium/navigator';
import type { Locator } from '../../src/interfaces';

interface PositionLabelData {
  currentPosition: number | null;
  totalPositions: number;
  label: string | null;
}

export const usePositionLabel = (
  navigator: EpubNavigator | null,
  positionsArray: Locator[]
): PositionLabelData => {
  const [currentPosition, setCurrentPosition] = useState<number | null>(null);
  const [totalPositions, setTotalPositions] = useState<number>(0);

  // Update total positions when positions array changes
  useEffect(() => {
    if (positionsArray && positionsArray.length > 0) {
      setTotalPositions(positionsArray.length);
    }
  }, [positionsArray]);

  // Listen to navigator position changes
  useEffect(() => {
    if (!navigator) return;

    // Get initial position if available
    const initialPosition = (navigator as any).currentLocation?.locations
      ?.position;
    if (initialPosition) {
      setCurrentPosition(initialPosition);
    }

    // Note: The positionChanged listener is already set up in useNavigator
    // We'll need to expose position updates through a callback
  }, [navigator]);

  // Generate label text
  const label =
    currentPosition && totalPositions > 0
      ? `${currentPosition} / ${totalPositions}`
      : null;

  return {
    currentPosition,
    totalPositions,
    label,
  };
};
