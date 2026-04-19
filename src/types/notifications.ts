export interface RecruiterNotification {
  id: string | number;
  title: string;
  detail: string;
  created_at?: string;
  read?: boolean;
  severity?: "info" | "success" | "warning" | "error";
}

export interface NotificationListResponse {
  results?: RecruiterNotification[];
  notifications?: RecruiterNotification[];
  data?: RecruiterNotification[];
}
