/**
 * Push delivery boundary (e.g. Expo Push / FCM / APNs). Not configured yet: deliveries on this channel
 * are recorded as "skipped" rather than pretending they were sent.
 * To connect one: implement PushSender, register it in NotificationsModule, store device push tokens per user.
 */
export abstract class PushSender {
  abstract readonly name: string;
  abstract readonly configured: boolean;
  abstract send(userId: string, message: { title: string; body: string; data?: Record<string, string> }): Promise<void>;
}

export class UnconfiguredPushSender extends PushSender {
  readonly name = "none";
  readonly configured = false;
  async send(): Promise<void> {
    throw new Error("No push provider configured");
  }
}
