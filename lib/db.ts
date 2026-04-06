import Dexie, { type Table } from "dexie";

interface OfflineTask {
  id?: number;
  serverTaskId?: string;
  data: Record<string, unknown>;
  synced: boolean;
  createdAt: Date;
}

interface OfflineAudio {
  id?: number;
  blob: Blob;
  processed: boolean;
  createdAt: Date;
}

class AiBekDB extends Dexie {
  tasks!: Table<OfflineTask>;
  audioQueue!: Table<OfflineAudio>;

  constructor() {
    super("ai-bek");
    this.version(1).stores({
      tasks: "++id, serverTaskId, synced",
      audioQueue: "++id, processed",
    });
  }
}

export const db = new AiBekDB();
