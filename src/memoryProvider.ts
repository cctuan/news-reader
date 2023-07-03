
type StorageType = {
  [key: string]: string;
}

class LocalStore {
  storage: StorageType;
  constructor() {
    this.storage = {}
  }
  get(key: string): string {
    return this.storage[key]
  }
  set(key: string, value: string) {
    this.storage[key] = value
  }
  del(key: string) {
    delete this.storage[key]
  }
}


class MemoryProvider {
  client: LocalStore;
  constructor(client: LocalStore) {
    this.client = client
  }
  static async init() {
    return new MemoryProvider(new LocalStore())
  }

  async getLog(key: string): Promise<ChatMessage[]> {
    try {
      const result =  await this.client.get(`news:${key}`) || '[]';
      return JSON.parse(result);
    } catch (err){
      console.error('Error: getLogs', err);
      return []
    }
  }

  async appendLog(key: string, chatMessages: ChatMessage[]): Promise<void> {
    try {
      const pastLogs = await this.getLog(key)
      const maxStoreCount = 6
      const totalLogs = [...pastLogs, ...chatMessages].slice(-maxStoreCount)

      await this.client.set(`news:${key}`, JSON.stringify(totalLogs));
    } catch (err) {
      console.error('Error: appendLog', err);
    }
  }

  async removeLog(key: string): Promise<void> {
    await this.client.del(`news:${key}`);

    try {
      await this.client.del(`news:${key}`)
    } catch (err) {
      console.error('Error: appendLog', err);
    }
  }
}

export default MemoryProvider
