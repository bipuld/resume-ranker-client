import API from "./axiox";
import type { NotificationListResponse, RecruiterNotification } from "../types/notifications";

const CANDIDATE_ENDPOINTS = ["notifications/", "recruiter/notifications/"] as const;

const normalizeNotification = (item: Record<string, any>, index: number): RecruiterNotification => {
  const createdAt =
    item.created_at ||
    item.createdAt ||
    item.timestamp ||
    item.time ||
    undefined;

  return {
    id: item.id || item.notification_id || `${index}-${item.title || item.message || "alert"}`,
    title: item.title || item.subject || "Notification",
    detail: item.detail || item.message || item.body || "No detail provided.",
    created_at: createdAt,
    read: Boolean(item.read ?? item.is_read ?? false),
    severity: item.severity || item.level || "info",
  };
};

const toNotificationList = (payload: unknown): RecruiterNotification[] => {
  const source = payload as NotificationListResponse | RecruiterNotification[] | Record<string, any>;

  if (Array.isArray(source)) {
    return source.map((item, index) => normalizeNotification(item as Record<string, any>, index));
  }

  const collections = [source?.results, source?.notifications, source?.data];
  for (const collection of collections) {
    if (Array.isArray(collection)) {
      return collection.map((item, index) => normalizeNotification(item as Record<string, any>, index));
    }
  }

  return [];
};

export const getRecruiterNotifications = async (): Promise<RecruiterNotification[]> => {
  for (const endpoint of CANDIDATE_ENDPOINTS) {
    try {
      const res = await API.get(endpoint);
      const notifications = toNotificationList(res.data);
      if (notifications.length > 0) {
        return notifications;
      }
      return notifications;
    } catch (err: any) {
      if (err?.response?.status === 404) {
        continue;
      }
      throw err;
    }
  }

  return [];
};
