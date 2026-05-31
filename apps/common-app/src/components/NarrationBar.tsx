import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Slider from '@react-native-community/slider';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {
  useAudioPlayer,
  useAudioPlayerStatus,
  setAudioModeAsync,
} from 'expo-audio';

import { palette, radii, space, typography } from '../styles/theme';

const PLAYBACK_RATES = [1, 1.25, 1.5, 1.75, 2];

const formatTime = (seconds?: number) => {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0)
    return '0:00';
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};

interface NarrationBarProps {
  /** URL of the narration audio track to play alongside the EPUB. */
  audioUrl: string;
}

/**
 * A compact audio bar that plays a separate narration track (via expo-audio)
 * alongside the EPUB text. Used for the "read-along" example because
 * react-native-readium doesn't implement EPUB Media Overlays — so the audio is
 * driven independently (not word-synced).
 */
export const NarrationBar: React.FC<NarrationBarProps> = ({ audioUrl }) => {
  const player = useAudioPlayer(audioUrl, { updateInterval: 500 });
  const status = useAudioPlayerStatus(player);
  const [seeking, setSeeking] = useState<number | null>(null);
  const draggingRef = useRef(false);
  const [rate, setRate] = useState(1);

  useEffect(() => {
    // Allow narration to play even when the device is in silent mode.
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }, []);

  const isLoaded = status?.isLoaded ?? false;
  const playing = status?.playing ?? false;
  const duration = status?.duration ?? 0;
  const position = seeking ?? status?.currentTime ?? 0;

  // Keep the seeked position shown until playback catches up, otherwise the
  // slider flickers back to the old position on release (status lags).
  useEffect(() => {
    if (seeking == null || draggingRef.current) return;
    if (Math.abs((status?.currentTime ?? 0) - seeking) < 1) setSeeking(null);
  }, [status?.currentTime, seeking]);

  useEffect(() => {
    if (seeking == null) return;
    const t = setTimeout(() => {
      if (!draggingRef.current) setSeeking(null);
    }, 1500);
    return () => clearTimeout(t);
  }, [seeking]);

  const togglePlay = useCallback(() => {
    if (player.playing) player.pause();
    else player.play();
  }, [player]);

  const onSeekStart = useCallback(() => {
    draggingRef.current = true;
  }, []);

  const onSeekComplete = useCallback(
    (value: number) => {
      draggingRef.current = false;
      player.seekTo(value);
      setSeeking(value); // hold the target until playback catches up
    },
    [player]
  );

  const cycleRate = useCallback(() => {
    const idx = PLAYBACK_RATES.indexOf(rate);
    const next = PLAYBACK_RATES[(idx + 1) % PLAYBACK_RATES.length] ?? 1;
    player.setPlaybackRate(next);
    setRate(next);
  }, [rate, player]);

  return (
    <View style={styles.bar}>
      <TouchableOpacity
        style={styles.play}
        onPress={togglePlay}
        accessibilityLabel={playing ? 'Pause narration' : 'Play narration'}
      >
        {!isLoaded ? (
          <ActivityIndicator size="small" color={palette.textInverse} />
        ) : (
          <MaterialIcons
            name={playing ? 'pause' : 'play-arrow'}
            size={26}
            color={palette.textInverse}
          />
        )}
      </TouchableOpacity>

      <View style={styles.center}>
        <View style={styles.labelRow}>
          <MaterialIcons
            name="headphones"
            size={12}
            color={palette.textTertiary}
          />
          <Text style={styles.label} numberOfLines={1}>
            Narration
          </Text>
        </View>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={duration > 0 ? duration : 1}
          value={Math.min(position, duration > 0 ? duration : 1)}
          onValueChange={setSeeking}
          onSlidingStart={onSeekStart}
          onSlidingComplete={onSeekComplete}
          minimumTrackTintColor={palette.accent}
          maximumTrackTintColor={palette.border}
          thumbTintColor={palette.accent}
          disabled={duration <= 0}
        />
        <View style={styles.times}>
          <Text style={styles.time}>{formatTime(position)}</Text>
          <Text style={styles.time}>{formatTime(duration)}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.rateChip}
        onPress={cycleRate}
        accessibilityLabel="Playback speed"
      >
        <Text style={styles.rateText}>{rate}×</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.lg,
    backgroundColor: palette.surface,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  play: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  center: {
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
  label: {
    ...typography.caption,
    color: palette.textTertiary,
  },
  slider: {
    width: '100%',
    height: 28,
  },
  times: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -space.xs,
  },
  time: {
    ...typography.small,
    color: palette.textTertiary,
    fontVariant: ['tabular-nums'],
  },
  rateChip: {
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radii.pill,
    backgroundColor: palette.surfaceMuted,
  },
  rateText: {
    ...typography.small,
    color: palette.textSecondary,
    fontWeight: '600',
  },
});
