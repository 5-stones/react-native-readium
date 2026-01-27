import { useState, useCallback } from 'react';
import type {
  DecorationGroups,
  Decoration,
  SelectionEvent,
  SelectionActionEvent,
  DecorationActivatedEvent,
} from 'react-native-readium';
import type { CurrentSelection, PendingHighlight } from '../types/reader.types';

export const useHighlights = () => {
  const [decorations, setDecorations] = useState<DecorationGroups>({
    highlights: [],
  });
  const [currentSelection, setCurrentSelection] =
    useState<CurrentSelection | null>(null);
  const [colorPickerVisible, setColorPickerVisible] = useState(false);
  const [pendingHighlight, setPendingHighlight] =
    useState<PendingHighlight | null>(null);
  const [editDialogVisible, setEditDialogVisible] = useState(false);
  const [selectedHighlight, setSelectedHighlight] = useState<Decoration | null>(
    null
  );

  // Selection change handler
  const handleSelectionChange = useCallback((event: SelectionEvent) => {
    if (event.locator && event.selectedText) {
      setCurrentSelection({
        locator: event.locator,
        text: event.selectedText,
      });
    } else {
      setCurrentSelection(null);
    }
  }, []);

  // Selection action handler (triggered by text selection menu)
  const handleSelectionAction = useCallback((event: SelectionActionEvent) => {
    if (event.actionId === 'highlight') {
      setPendingHighlight({
        locator: event.locator,
        selectedText: event.selectedText,
      });
      setColorPickerVisible(true);
    }
  }, []);

  // Create highlight from color picker
  const handleCreateHighlight = useCallback(
    (color: string, note: string) => {
      if (!pendingHighlight) return;

      const newHighlight: Decoration = {
        id: `highlight-${Date.now()}`,
        locator: pendingHighlight.locator,
        style: {
          type: 'highlight',
          tint: color,
        },
        extras: {
          note,
          createdAt: new Date().toISOString(),
          selectedText: pendingHighlight.selectedText,
        },
      };

      setDecorations((prev) => ({
        ...prev,
        highlights: [...(prev.highlights || []), newHighlight],
      }));

      setColorPickerVisible(false);
      setPendingHighlight(null);
    },
    [pendingHighlight]
  );

  // Cancel highlight creation
  const handleCancelHighlight = useCallback(() => {
    setColorPickerVisible(false);
    setPendingHighlight(null);
  }, []);

  // Delete highlight
  const handleDeleteHighlight = useCallback((id: string) => {
    setDecorations((prev) => ({
      ...prev,
      highlights: (prev.highlights || []).filter((h) => h.id !== id),
    }));
  }, []);

  // Handle decoration activation (tap on highlight)
  const handleDecorationActivated = useCallback(
    (event: DecorationActivatedEvent) => {
      const { decoration } = event;
      setSelectedHighlight(decoration);
      setEditDialogVisible(true);
    },
    []
  );

  // Open edit dialog for a highlight (from highlight manager)
  const handleEditHighlight = useCallback((highlight: Decoration) => {
    setSelectedHighlight(highlight);
    setEditDialogVisible(true);
  }, []);

  // Update highlight (update both color and note)
  const handleUpdateHighlight = useCallback(
    (id: string, color: string, note: string) => {
      setDecorations((prev) => ({
        ...prev,
        highlights: (prev.highlights || []).map((h) =>
          h.id === id
            ? {
                ...h,
                style: { ...h.style, tint: color },
                extras: { ...h.extras, note },
              }
            : h
        ),
      }));
      setEditDialogVisible(false);
      setSelectedHighlight(null);
    },
    []
  );

  // Delete highlight from edit dialog
  const handleDeleteFromDialog = useCallback((id: string) => {
    setDecorations((prev) => ({
      ...prev,
      highlights: (prev.highlights || []).filter((h) => h.id !== id),
    }));
    setEditDialogVisible(false);
    setSelectedHighlight(null);
  }, []);

  // Cancel edit dialog
  const handleCancelEdit = useCallback(() => {
    setEditDialogVisible(false);
    setSelectedHighlight(null);
  }, []);

  return {
    // State
    decorations,
    currentSelection,
    colorPickerVisible,
    pendingHighlight,
    editDialogVisible,
    selectedHighlight,

    // Handlers
    handleSelectionChange,
    handleSelectionAction,
    handleCreateHighlight,
    handleCancelHighlight,
    handleDeleteHighlight,
    handleUpdateHighlight,
    handleDecorationActivated,
    handleEditHighlight,
    handleDeleteFromDialog,
    handleCancelEdit,
  };
};
