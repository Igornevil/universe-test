/**
 * A persisted record of an event received from the broker.
 * The Notifications service has a deliberately thin domain: each event
 * becomes one Notification row, preserving the original payload for audit.
 */
export interface Notification {
  id: string;
  eventId: string;
  eventName: string;
  occurredAt: Date;
  receivedAt: Date;
  payload: Record<string, unknown>;
}

export const NOTIFICATION_REPOSITORY = 'NotificationRepository';

export interface NotificationRepository {
  /**
   * Stores the notification. Returns true if a new row was inserted and false
   * if a record with the same eventId already exists (idempotent no-op).
   */
  save(notification: Notification): Promise<boolean>;
}
