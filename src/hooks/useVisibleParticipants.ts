import { useState, useEffect } from 'react';

interface Participant {
  userId?: string;
  user_id?: string;
  id?: string;
}

/**
 * Hook for managing visible participants in charts
 * Provides toggle functionality and maintains visibility state
 */
export function useVisibleParticipants<T extends Participant>(participants: T[]) {
  const [visible, setVisible] = useState<Set<string>>(new Set());

  // Initialize with all participants visible when participants change
  useEffect(() => {
    if (participants.length > 0 && visible.size === 0) {
      const participantIds = participants.map(p => 
        p.userId || p.user_id || p.id || ''
      ).filter(Boolean);
      setVisible(new Set(participantIds));
    }
  }, [participants, visible.size]);

  const toggle = (id: string) => {
    setVisible(prev => {
      const copy = new Set(prev);
      if (copy.has(id)) {
        copy.delete(id);
      } else {
        copy.add(id);
      }
      return copy;
    });
  };

  const toggleAll = () => {
    if (visible.size === participants.length) {
      setVisible(new Set());
    } else {
      const participantIds = participants.map(p => 
        p.userId || p.user_id || p.id || ''
      ).filter(Boolean);
      setVisible(new Set(participantIds));
    }
  };

  const isVisible = (id: string) => visible.has(id);

  return {
    visible,
    toggle,
    toggleAll,
    isVisible,
    visibleCount: visible.size
  };
}