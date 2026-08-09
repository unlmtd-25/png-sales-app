import { v4 as uuidv4 } from 'uuid';
import { getDeviceId } from './db';

// Append-only entity IDs are device-prefixed so two devices can never collide
// on import (orders, stocktake, surveys). Master data (products, customers)
// uses a plain UUID since it merges by version, not by device.
export function newDeviceScopedId(prefix: string): string {
  return `${getDeviceId()}-${prefix}-${uuidv4().slice(0, 8)}`;
}

export function newId(): string {
  return uuidv4();
}
