import type { IncomingMessage, OutgoingMessage } from "@/domain/protocol";

export interface PartySocketHandlers {
  onMessage: (message: IncomingMessage) => void;
  onClose: (event: CloseEvent) => void;
  onOpen?: (event: Event) => void;
}

/**
 * Thin typed wrapper around the party WebSocket. It knows nothing about the
 * DOM or sync logic — it just serialises {@link OutgoingMessage} and parses
 * {@link IncomingMessage}.
 *
 * 接続が OPEN になる前に呼ばれた `send()` は内部キューに退避し、`open` 発火時に
 * まとめて flush する。これで「200ms タイマー後に送信したら InvalidStateError」
 * や「onopen への代入が間に合わなかった」といったタイミング依存の取りこぼしが
 * 構造的に消える。
 */
export class PartyWebSocketClient {
  private socket: WebSocket | null = null;
  private outbox: string[] = [];

  constructor(private readonly url: string) { }

  connect(handlers: PartySocketHandlers): void {
    const socket = new WebSocket(this.url);
    socket.onmessage = (event: MessageEvent<string>) => {
      handlers.onMessage(JSON.parse(event.data) as IncomingMessage);
    };
    socket.onclose = (event) => handlers.onClose(event);
    socket.onopen = (event) => {
      // 接続前に積まれていた送信を順番に flush してから上位の onOpen を呼ぶ。
      while (this.outbox.length > 0) {
        const data = this.outbox.shift();
        if (data !== undefined) socket.send(data);
      }
      handlers.onOpen?.(event);
    };
    this.socket = socket;
    // 防御的フォールバック: もし assignment 後に既に OPEN だった場合
    // （極端に高速なローカル接続）も onopen を発火させる。
    if (socket.readyState === WebSocket.OPEN) {
      // setTimeout(0) で現フレーム外に出してから onopen を発火（onmessage 等が
      // 確実に attach 済みの状態で flush するため）。
      window.setTimeout(() => socket.onopen?.(new Event("open")), 0);
    }
  }

  send(message: OutgoingMessage): void {
    const data = JSON.stringify(message);
    const s = this.socket;
    if (!s) throw new Error("socket not connected");
    if (s.readyState === WebSocket.OPEN) {
      s.send(data);
      return;
    }
    if (s.readyState === WebSocket.CONNECTING) {
      // open を待ってから flush するためキューに退避（throw しない）。
      this.outbox.push(data);
      return;
    }
    throw new Error(`socket not writable (readyState=${s.readyState})`);
  }

  close(): void {
    this.socket?.close();
  }
}
