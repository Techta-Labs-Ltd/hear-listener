import type { InteractionReceipt } from "@/types";

export class RequestLedger {
  private receipts: Map<string, InteractionReceipt> = new Map();
  private maxEntries: number;

  constructor(maxEntries = 50) {
    this.maxEntries = maxEntries;
  }

  public record(receipt: InteractionReceipt): void {
    this.receipts.set(receipt.idempotencyKey, receipt);
    if (this.receipts.size > this.maxEntries) {
      const oldestKey = this.receipts.keys().next().value;
      if (oldestKey) {
        this.receipts.delete(oldestKey);
      }
    }
  }

  public isCompleted(idempotencyKey: string): boolean {
    const receipt = this.receipts.get(idempotencyKey);
    return receipt?.status === "completed";
  }

  public getReceipt(idempotencyKey: string): InteractionReceipt | undefined {
    return this.receipts.get(idempotencyKey);
  }

  public getRecentReceipts(): InteractionReceipt[] {
    return Array.from(this.receipts.values()).reverse();
  }

  public clear(): void {
    this.receipts.clear();
  }
}

export const requestLedger = new RequestLedger();
