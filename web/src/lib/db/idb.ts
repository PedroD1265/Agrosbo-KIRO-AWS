import Dexie, { type Table } from 'dexie';

export type QueueDomain =
  | 'task:create'
  | 'task:status'
  | 'task:update'
  | 'task:delete'
  | 'irrigation:create'
  | 'irrigation:done'
  | 'irrigation:update'
  | 'irrigation:delete'
  | 'observation:create'
  | 'observation:delete'
  | 'inventory:create'
  | 'inventory:adjust'
  | 'inventory:update'
  | 'inventory:delete'
  | 'harvest:create'
  | 'harvest:update'
  | 'harvest:delete'
  | 'campaign:create'
  | 'campaign:update'
  | 'campaign:delete'
  | 'block:create'
  | 'block:update'
  | 'block:delete'
  | 'block:geometry'
  | 'block:import'
  | 'greenhouse:create'
  | 'greenhouse:update'
  | 'greenhouse:delete'
  | 'greenhouse:location'
  | 'observation:location'
  | 'settings:update'
  | 'application:create'
  | 'apiary:create'
  | 'hive:create'
  | 'hive-inspection:create'
  | 'honey-harvest:create'
  | 'expense:create'
  | 'expense:delete'
  | 'labor:create'
  | 'attachment:upload'
  | 'attachment:delete'
  | 'user:create';

export type QueueStatus = 'pending' | 'syncing' | 'failed';

export interface QueuedMutation {
  clientId: string;
  domain: QueueDomain;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  body: unknown;
  invalidateKeys: string[][];
  status: QueueStatus;
  attempts: number;
  lastError?: string;
  createdAt: number;
  updatedAt: number;
}

export interface IdMapEntry {
  tempId: string;
  realId: string;
  createdAt: number;
}

export class AgrosBODB extends Dexie {
  mutations!: Table<QueuedMutation, string>;
  idMap!: Table<IdMapEntry, string>;

  constructor() {
    super('agrosbo');
    this.version(1).stores({
      mutations: 'clientId, status, domain, createdAt',
    });
    this.version(2).stores({
      mutations: 'clientId, status, domain, createdAt',
      idMap: 'tempId, realId, createdAt',
    });
  }
}

export const idb = new AgrosBODB();
