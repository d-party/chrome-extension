import AWN from "awesome-notifications";

import type { Notifier } from "@/application/ports";

/** {@link Notifier} backed by awesome-notifications (AWN). */
export class AwnNotifier implements Notifier {
  private readonly awn = new AWN({
    position: "top-right",
    maxNotifications: 4,
    animationDuration: 200,
    durations: { global: 3000 },
  });

  success(messageHtml: string): void {
    this.awn.success(messageHtml);
  }

  info(messageHtml: string): void {
    this.awn.info(messageHtml);
  }

  alert(message: string): void {
    this.awn.alert(message);
  }
}
