/**
 * Guards against feedback loops: when a remote video operation is applied to
 * the local player it triggers DOM media events (seeking, ratechange, …). While
 * the guard is "closed" those events are not echoed back to the server.
 *
 * This is the typed replacement for the original global `available_action`.
 */
export class ActionGuard {
  private _available = true;

  get available(): boolean {
    return this._available;
  }

  suppress(): void {
    this._available = false;
  }

  allow(): void {
    this._available = true;
  }
}
