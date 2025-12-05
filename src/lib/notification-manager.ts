// Simple event emitter for notification updates
class NotificationManager {
  private listeners: (() => void)[] = [];

  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  refresh() {
    this.listeners.forEach((listener) => listener());
  }
}

export const notificationManager = new NotificationManager();
export const taskNotificationManager = notificationManager;
