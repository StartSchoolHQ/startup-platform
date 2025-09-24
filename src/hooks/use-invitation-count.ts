import { useState, useEffect, useCallback } from 'react';
import { getInvitationCount } from '@/lib/database';

// Simple event emitter for invitation count updates
class InvitationCountManager {
  private listeners: (() => void)[] = [];

  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  refresh() {
    this.listeners.forEach(listener => listener());
  }
}

export const invitationCountManager = new InvitationCountManager();

export function useInvitationCount(userId: string | undefined) {
  const [count, setCount] = useState(0);

  const loadCount = useCallback(async () => {
    if (userId) {
      try {
        const newCount = await getInvitationCount(userId);
        setCount(newCount);
      } catch (error) {
        console.error('Error loading invitation count:', error);
      }
    }
  }, [userId]);

  useEffect(() => {
    loadCount();
  }, [loadCount]);

  useEffect(() => {
    const unsubscribe = invitationCountManager.subscribe(() => {
      loadCount();
    });
    return unsubscribe;
  }, [loadCount]);

  const refreshCount = useCallback(() => {
    invitationCountManager.refresh();
  }, []);

  return { count, refreshCount };
}