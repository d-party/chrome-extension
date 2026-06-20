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
 */
export class PartyWebSocketClient {
  private socket: WebSocket | null = null;

  constructor(private readonly url: string) {}

  connect(handlers: PartySocketHandlers): void {
    const socket = new WebSocket(this.url);
    socket.onmessage = (event: MessageEvent<string>) => {
      handlers.onMessage(JSON.parse(event.data) as IncomingMessage);
    };
    socket.onclose = (event) => handlers.onClose(event);
    if (handlers.onOpen) socket.onopen = handlers.onOpen;
    this.socket = socket;
  }

  /** Send a message. Throws if the socket is not open (caller handles it). */
  send(message: OutgoingMessage): void {
    if (!this.socket) throw new Error("socket not connected");
    this.socket.send(JSON.stringify(message));
  }

  close(): void {
    this.socket?.close();
  }
}
