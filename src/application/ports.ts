/**
 * Ports: the boundary between the application's sync logic and the outside
 * world (the dアニメストア DOM, notifications, settings). The presentation
 * layer provides concrete implementations.
 */

import type { PlayerOption, SyncOption, User } from "@/domain/protocol";
import type { ReactionType } from "@/domain/reactions";
import type { Settings } from "@/domain/settings";

export interface Notifier {
  success(messageHtml: string): void;
  info(messageHtml: string): void;
  alert(message: string): void;
}

/** Controls the dアニメストア HTML5 player and reads its state. */
export interface PlayerController {
  getOption(): PlayerOption;
  getTitle(): string;
  /** Apply a remote video operation (play/pause/seek/next/...). */
  onAction(operation: string, option: SyncOption): void;
  /** Apply a full sync to the host's state. */
  onSync(option: SyncOption): void;
}

/** Renders the sidebar (share/history/users/control panels). */
export interface SidebarView {
  setShareLink(roomUrl: string): void;
  addHistory(text: string): void;
  addHistoryUser(userName: string): void;
  leaveHistoryUser(userName: string): void;
  updateUserList(users: User[]): void;
  hideSidebar(): void;
}

/** Plays the on-screen reaction animations. */
export interface ReactionView {
  play(type: ReactionType): void;
}

/** Read-only access to the current user settings (kept live). */
export interface SettingsProvider {
  current(): Settings;
}
