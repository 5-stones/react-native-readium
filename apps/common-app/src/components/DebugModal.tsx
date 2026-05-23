import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { BaseModal } from './BaseModal';
import { ReaderButton } from './ReaderButton';
import { modalStyles } from '../styles/modal';
import { palette, radii, space, typography } from '../styles/theme';
import type { EventLogEntry, ReaderHandle } from './Reader';

interface DebugModalProps {
  handle: ReaderHandle | null;
}

type ResultState =
  | { kind: 'idle' }
  | { kind: 'pending'; label: string }
  | { kind: 'ok'; label: string; value: unknown }
  | { kind: 'err'; label: string; error: string };

const safeStringify = (value: unknown, maxChars = 1500) => {
  let raw: string;
  try {
    raw = JSON.stringify(
      value,
      (_k, v) => {
        if (typeof v === 'string' && v.length > 200) {
          return `${v.slice(0, 200)}… (${v.length} chars)`;
        }
        return v;
      },
      2
    );
  } catch {
    raw = String(value);
  }
  if (raw && raw.length > maxChars) {
    return `${raw.slice(0, maxChars)}…`;
  }
  return raw;
};

const fmtTime = (t: number) => {
  const d = new Date(t);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const eventBadge: Record<EventLogEntry['type'], { label: string; color: string; bg: string }> = {
  error: { label: 'ERR', color: palette.destructive, bg: palette.destructiveSoft },
  unsupported: { label: 'UNSUPP', color: palette.warning, bg: '#FBE9D6' },
  searchProgress: { label: 'SEARCH', color: palette.link, bg: palette.linkSoft },
  mediaState: { label: 'MEDIA', color: palette.success, bg: '#E1F4EB' },
  mediaError: { label: 'MEDIA ERR', color: palette.destructive, bg: palette.destructiveSoft },
};

export const DebugModal: React.FC<DebugModalProps> = ({ handle }) => {
  const [visible, setVisible] = useState(false);
  const [result, setResult] = useState<ResultState>({ kind: 'idle' });

  const runAsync = useCallback(
    async (label: string, fn: () => Promise<unknown>) => {
      setResult({ kind: 'pending', label });
      try {
        const value = await fn();
        setResult({ kind: 'ok', label, value });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setResult({ kind: 'err', label, error: msg });
      }
    },
    []
  );

  const runSync = useCallback((label: string, fn: () => unknown) => {
    try {
      const value = fn();
      setResult({ kind: 'ok', label, value: value ?? '(no return value)' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setResult({ kind: 'err', label, error: msg });
    }
  }, []);

  if (!handle) {
    return null;
  }

  const buttons: Array<{
    icon: string;
    label: string;
    run: () => void;
    tone?: 'default' | 'warn';
  }> = [
    {
      icon: 'description',
      label: 'getPublication',
      run: () => runAsync('getPublication', handle.getPublication),
    },
    {
      icon: 'place',
      label: 'getCurrentLocation',
      run: () => runAsync('getCurrentLocation', handle.getCurrentLocation),
    },
    {
      icon: 'view-stream',
      label: 'getPositions',
      run: () => runAsync('getPositions', handle.getPositions),
    },
    {
      icon: 'list',
      label: 'getTableOfContents',
      run: () => runAsync('getTableOfContents', handle.getTableOfContents),
    },
    {
      icon: 'text-fields',
      label: 'getCurrentSelection',
      run: () => runAsync('getCurrentSelection', handle.getCurrentSelection),
    },
    {
      icon: 'clear',
      label: 'clearSelection',
      run: () => runSync('clearSelection', handle.clearSelection),
    },
    {
      icon: 'file-download',
      label: 'getResource (first toc)',
      run: () => {
        const first = handle.toc?.[0];
        if (!first) {
          setResult({
            kind: 'err',
            label: 'getResource',
            error: 'No TOC entries available',
          });
          return;
        }
        runAsync(`getResource(${first.href})`, () =>
          handle.getResource(first.href)
        );
      },
    },
    {
      icon: 'text-format',
      label: 'setSelection (1st toc match)',
      run: () => {
        const first = handle.toc?.[0];
        if (!first) {
          setResult({
            kind: 'err',
            label: 'setSelection',
            error: 'No TOC entries available',
          });
          return;
        }
        // Pick a short test word that's very likely to appear in the resource.
        const testWord = 'the';
        runAsync(`setSelection(${first.href}, "${testWord}")`, () =>
          handle.setSelection({
            href: first.href,
            type: first.type || 'application/xhtml+xml',
            title: first.title || '',
            locations: { progression: 0 },
            text: { highlight: testWord },
          })
        );
      },
    },
    {
      icon: 'play-arrow',
      label: 'play() → expect unsupported',
      run: () => runSync('play', handle.play),
      tone: 'warn',
    },
    {
      icon: 'pause',
      label: 'pause() → expect unsupported',
      run: () => runSync('pause', handle.pause),
      tone: 'warn',
    },
    {
      icon: 'graphic-eq',
      label: 'getMediaState',
      run: () => runAsync('getMediaState', handle.getMediaState),
      tone: 'warn',
    },
  ];

  return (
    <>
      <ReaderButton
        size={20}
        name="bug-report"
        onPress={() => setVisible(true)}
      />

      <BaseModal
        visible={visible}
        title="API Debug"
        onClose={() => setVisible(false)}
      >
        <Text style={modalStyles.sectionTitle}>Imperative methods</Text>
        <View style={styles.grid}>
          {buttons.map((b) => (
            <TouchableOpacity
              key={b.label}
              style={[
                styles.button,
                b.tone === 'warn' && styles.buttonWarn,
              ]}
              onPress={b.run}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name={b.icon}
                size={16}
                color={
                  b.tone === 'warn' ? palette.warning : palette.textPrimary
                }
              />
              <Text
                style={[
                  styles.buttonLabel,
                  b.tone === 'warn' && { color: palette.warning },
                ]}
                numberOfLines={1}
              >
                {b.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[modalStyles.sectionTitle, { marginTop: space.lg }]}>
          Last result
        </Text>
        <View style={styles.resultCard}>
          {result.kind === 'idle' ? (
            <Text style={styles.placeholder}>
              Tap a method above to invoke it.
            </Text>
          ) : result.kind === 'pending' ? (
            <Text style={styles.placeholder}>
              {result.label} — running…
            </Text>
          ) : result.kind === 'err' ? (
            <>
              <Text style={styles.resultHeader}>
                {result.label}{' '}
                <Text style={{ color: palette.destructive }}>· error</Text>
              </Text>
              <Text style={styles.errorText}>{result.error}</Text>
            </>
          ) : (
            <>
              <Text style={styles.resultHeader}>
                {result.label}{' '}
                <Text style={{ color: palette.success }}>· ok</Text>
              </Text>
              <ScrollView
                style={styles.jsonScroller}
                horizontal
                showsHorizontalScrollIndicator
              >
                <Text style={styles.json}>{safeStringify(result.value)}</Text>
              </ScrollView>
            </>
          )}
        </View>

        <View style={styles.eventHeader}>
          <Text style={modalStyles.sectionTitle}>
            Events · {handle.eventLog.length}
          </Text>
          {handle.eventLog.length > 0 ? (
            <TouchableOpacity
              onPress={handle.clearEventLog}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.clearLink}>Clear</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {handle.eventLog.length === 0 ? (
          <Text style={modalStyles.emptyText}>
            No errors, unsupported-capability, search-progress or media events
            captured yet.
          </Text>
        ) : (
          handle.eventLog.map((e) => {
            const b = eventBadge[e.type];
            return (
              <View key={e.id} style={styles.eventCard}>
                <View style={styles.eventHeaderRow}>
                  <View style={[styles.badge, { backgroundColor: b.bg }]}>
                    <Text style={[styles.badgeText, { color: b.color }]}>
                      {b.label}
                    </Text>
                  </View>
                  <Text style={styles.eventTime}>{fmtTime(e.timestamp)}</Text>
                </View>
                <Text style={styles.json} numberOfLines={6}>
                  {safeStringify(e.payload, 600)}
                </Text>
              </View>
            );
          })
        )}
      </BaseModal>
    </>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radii.pill,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    maxWidth: '100%',
  },
  buttonWarn: {
    borderColor: '#F1C58B',
    backgroundColor: '#FFF7EC',
  },
  buttonLabel: {
    ...typography.small,
    color: palette.textPrimary,
    fontWeight: '600',
  },
  resultCard: {
    backgroundColor: palette.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    padding: space.md,
    minHeight: 60,
    marginBottom: space.lg,
  },
  resultHeader: {
    ...typography.bodyStrong,
    marginBottom: space.xs,
  },
  placeholder: {
    ...typography.small,
    color: palette.textTertiary,
  },
  errorText: {
    ...typography.small,
    color: palette.destructive,
    fontFamily: 'Menlo',
  },
  jsonScroller: {
    maxHeight: 180,
  },
  json: {
    fontFamily: 'Menlo',
    fontSize: 11,
    lineHeight: 16,
    color: palette.textPrimary,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clearLink: {
    ...typography.small,
    color: palette.link,
    fontWeight: '600',
  },
  eventCard: {
    backgroundColor: palette.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    padding: space.md,
    marginBottom: space.sm,
  },
  eventHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.xs,
  },
  badge: {
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  eventTime: {
    fontSize: 11,
    color: palette.textTertiary,
    fontVariant: ['tabular-nums'],
  },
});
