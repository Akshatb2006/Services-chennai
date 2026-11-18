import { apiRequest } from "./client";

export type AppNotification = { id: string; type: string; title: string; body: string; requestId: string | null; readAt: string | null; createdAt: string };

export const notificationsApi = {
  list: (signal?: AbortSignal) => apiRequest<AppNotification[]>("/notifications", { signal }),
  markRead: (id: string) => apiRequest<{ updated: boolean }>(`/notifications/${encodeURIComponent(id)}/read`, { method: "POST" }),
};
