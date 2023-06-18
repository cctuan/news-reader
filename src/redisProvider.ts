
import { createClient, RedisClientType } from 'redis';

class RedisProvider {
  private client: RedisClientType;
  constructor(client: RedisClientType) {
    this.client = client
  }
  static async init() {
    const client = createClient({
      password: process.env.REDIS_PASSWORD,
      socket: {
          host: process.env.REDIS_HOST,
          port: Number(process.env.REDIS_PORT),
      }
    })
    await client.connect()
    // @ts-ignore
    return new RedisProvider(client)
  }
  async initRedisStorage() {
    try {
      await this.client.connect();
    } catch (err) {
      console.error(err);
    }
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

      await this.client.set(`news:${key}`, JSON.stringify(totalLogs), {
        EX: 5 * 60
      });
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

export default RedisProvider
