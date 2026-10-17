import { HistoryAction, WorkInterval, LeaveRecord } from '../types';

const STORAGE_KEY_HISTORY = 'hozur_action_history';
const MAX_HISTORY_ITEMS = 30;

class HistoryServiceClass {
  private listeners: Array<(history: HistoryAction[]) => void> = [];

  getHistory(): HistoryAction[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_HISTORY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  recordAction(
    actionType: HistoryAction['actionType'],
    description: string,
    previousData?: any,
    newData?: any
  ): HistoryAction {
    const action: HistoryAction = {
      id: 'act-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      timestamp: Date.now(),
      actionType,
      description,
      previousData,
      newData,
    };

    const current = this.getHistory();
    const updated = [action, ...current].slice(0, MAX_HISTORY_ITEMS);
    try {
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save history', e);
    }
    this.notify(updated);
    return action;
  }

  getLastAction(): HistoryAction | null {
    const list = this.getHistory();
    return list.length > 0 ? list[0] : null;
  }

  popLastAction(): HistoryAction | null {
    const list = this.getHistory();
    if (list.length === 0) return null;
    const [last, ...rest] = list;
    try {
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(rest));
    } catch (e) {
      console.warn('Failed to update history', e);
    }
    this.notify(rest);
    return last;
  }

  clearHistory(): void {
    try {
      localStorage.removeItem(STORAGE_KEY_HISTORY);
    } catch (e) {
      console.warn('Failed to clear history', e);
    }
    this.notify([]);
  }

  subscribe(callback: (history: HistoryAction[]) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private notify(history: HistoryAction[]) {
    this.listeners.forEach((cb) => {
      try {
        cb(history);
      } catch (e) {
        console.error(e);
      }
    });
  }
}

export const HistoryService = new HistoryServiceClass();
