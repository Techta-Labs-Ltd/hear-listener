export class ShakeDispatchGate {
  private inFlight = false;

  public begin(): boolean {
    if (this.inFlight) return false;
    this.inFlight = true;
    return true;
  }

  public end(): void {
    this.inFlight = false;
  }

  public reset(): void {
    this.inFlight = false;
  }
}
