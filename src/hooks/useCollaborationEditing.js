import { useCallback, useEffect } from 'react';
import { getEditingTargetLabel } from '../utils/presence';

const focusMovesWithin = (event) => {
  const nextFocusedElement = event?.relatedTarget;
  return Boolean(nextFocusedElement && event?.currentTarget?.contains?.(nextFocusedElement));
};

export const useCollaborationEditing = ({
  canEdit = false,
  updatePresenceEditingTarget,
  updateRealtimeEditingTarget
} = {}) => {
  const stopEditing = useCallback(() => {
    updatePresenceEditingTarget?.('');
    void updateRealtimeEditingTarget?.('');
  }, [updatePresenceEditingTarget, updateRealtimeEditingTarget]);

  const startEditing = useCallback((target = '') => {
    if (!canEdit || !target) return;
    updatePresenceEditingTarget?.(target);
    void updateRealtimeEditingTarget?.(target, getEditingTargetLabel(target));
  }, [canEdit, updatePresenceEditingTarget, updateRealtimeEditingTarget]);

  const getEditingHandlers = useCallback((target = '') => ({
    onFocusCapture: () => startEditing(target),
    onBlurCapture: (event) => {
      if (!canEdit || !target || focusMovesWithin(event)) return;
      stopEditing();
    }
  }), [canEdit, startEditing, stopEditing]);

  useEffect(() => {
    if (!canEdit) {
      stopEditing();
    }
  }, [canEdit, stopEditing]);

  useEffect(() => () => {
    stopEditing();
  }, [stopEditing]);

  return {
    startEditing,
    stopEditing,
    getEditingHandlers
  };
};

export default useCollaborationEditing;
