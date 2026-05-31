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

import type { BookOption } from '../types/reader.types';
import { palette, radii, space, typography, shadow } from '../styles/theme';

const PLAYBACK_RATES = [1, 1.25, 1.5, 1.75, 2];
const SKIP_SECONDS = 30;

const COVER_TINTS: Array<[string, string]> = [
  ['#E9E4DA', '#2A2823'],
  ['#DDE7E1', '#1F3A2E'],
  ['#E8DEEA', '#3B2A4A'],
  ['#F4E1D2', '#5A2E18'],
  ['#D9E2F0', '#1F3A5C'],
  ['#EFE1DC', '#5C2B1F'],
];

const hashCode = (str: string) => {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
};

const tintFor = (id: string) => COVER_TINTS[hashCode(id) % COVER_TINTS.length];

const initialsFor = (title: string) =>
  title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

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

interface AudioPlayerProps {
  book: BookOption;
  audioUrl: string;
}

/**
 * Full-screen audiobook player. Plays a streamed audio track via expo-audio
 * (react-native-readium's audio navigator doesn't reliably stream remote
 * audiobooks, so the example drives audio independently).
 */
export const AudioPlayer: React.FC<AudioPlayerProps> = ({ book, audioUrl }) => {
  const player = useAudioPlayer(audioUrl, { updateInterval: 500 });
  const status = useAudioPlayerStatus(player);
  const [seeking, setSeeking] = useState<number | null>(null);
  const draggingRef = useRef(false);
  const [rate, setRate] = useState(1);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }, []);

  const isLoaded = status?.isLoaded ?? false;
  const playing = status?.playing ?? false;
  const duration = status?.duration ?? 0;
  const position = seeking ?? status?.currentTime ?? 0;

  // After releasing the scrubber, keep showing the seeked position until the
  // player's reported time catches up — otherwise the slider flickers back to
  // the previous position (status only updates every `updateInterval`ms).
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

  const skipBy = useCallback(
    (delta: number) => {
      const target = Math.max(
        0,
        Math.min((status?.currentTime ?? 0) + delta, duration || Infinity)
      );
      player.seekTo(target);
    },
    [player, status, duration]
  );

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

  const [bg, fg] = tintFor(book.id);

  return (
    <View style={styles.full}>
      <View style={[styles.cover, { backgroundColor: bg }]}>
        <Text style={[styles.coverInitials, { color: fg }]}>
          {initialsFor(book.title)}
        </Text>
        <View style={[styles.coverSpine, { backgroundColor: fg }]} />
        <MaterialIcons
          name="headphones"
          size={26}
          color={fg}
          style={styles.coverBadge}
        />
      </View>

      <Text style={styles.eyebrow}>Audiobook</Text>
      <Text style={styles.title} numberOfLines={2}>
        {book.title}
      </Text>
      <Text style={styles.author}>{book.author}</Text>
      {book.narrator ? (
        <Text style={styles.narrator}>{book.narrator}</Text>
      ) : null}

      <View style={styles.scrubberBlock}>
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
          <Text style={styles.timeText}>{formatTime(position)}</Text>
          <Text style={styles.timeText}>{formatTime(duration)}</Text>
        </View>
      </View>

      <View style={styles.transport}>
        <TouchableOpacity
          onPress={() => skipBy(-SKIP_SECONDS)}
          accessibilityLabel="Back 30 seconds"
          style={styles.skipButton}
          disabled={!isLoaded}
        >
          <MaterialIcons
            name="replay-30"
            size={34}
            color={palette.textPrimary}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={togglePlay}
          accessibilityLabel={playing ? 'Pause' : 'Play'}
          style={styles.playButton}
          disabled={!isLoaded}
        >
          {!isLoaded ? (
            <ActivityIndicator size="large" color={palette.textInverse} />
          ) : (
            <MaterialIcons
              name={playing ? 'pause' : 'play-arrow'}
              size={44}
              color={palette.textInverse}
            />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => skipBy(SKIP_SECONDS)}
          accessibilityLabel="Forward 30 seconds"
          style={styles.skipButton}
          disabled={!isLoaded}
        >
          <MaterialIcons
            name="forward-30"
            size={34}
            color={palette.textPrimary}
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.rateChip}
        onPress={cycleRate}
        accessibilityLabel="Playback speed"
      >
        <MaterialIcons name="speed" size={16} color={palette.textSecondary} />
        <Text style={styles.rateText}>{rate}× speed</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  full: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xxl,
    gap: space.sm,
    backgroundColor: palette.bg,
  },
  cover: {
    width: 200,
    height: 280,
    borderRadius: radii.md,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: space.xl,
    ...shadow.md,
  },
  coverSpine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
    opacity: 0.6,
  },
  coverBadge: {
    position: 'absolute',
    bottom: space.md,
    right: space.md,
    opacity: 0.7,
  },
  coverInitials: {
    fontSize: 52,
    fontWeight: '700',
    letterSpacing: 1,
  },
  eyebrow: {
    ...typography.caption,
    color: palette.textTertiary,
  },
  title: {
    ...typography.title,
    textAlign: 'center',
  },
  author: {
    ...typography.body,
    color: palette.textSecondary,
    textAlign: 'center',
  },
  narrator: {
    ...typography.small,
    color: palette.textTertiary,
    textAlign: 'center',
  },
  scrubberBlock: {
    width: '100%',
    marginTop: space.lg,
  },
  slider: {
    width: '100%',
    height: 36,
  },
  times: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: space.xs,
  },
  timeText: {
    ...typography.small,
    color: palette.textTertiary,
    fontVariant: ['tabular-nums'],
  },
  transport: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xl,
    marginTop: space.md,
  },
  skipButton: {
    padding: space.xs,
  },
  playButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: palette.accent,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadow.md,
  },
  rateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radii.pill,
    backgroundColor: palette.surfaceMuted,
    marginTop: space.sm,
  },
  rateText: {
    ...typography.small,
    color: palette.textSecondary,
    fontWeight: '600',
  },
});
