import Redis from "ioredis";

type MessageCallback = (data: string) => void;

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

const globalForPubSub = globalThis as unknown as {
  pubsubPublisher: Redis | undefined;
  pubsubHub: PubSubHub | undefined;
};

function getPublisher(): Redis {
  if (!globalForPubSub.pubsubPublisher) {
    globalForPubSub.pubsubPublisher = new Redis(REDIS_URL);
  }
  return globalForPubSub.pubsubPublisher;
}

class PubSubHub {
  private subscriber: Redis;
  private listeners = new Map<string, Set<MessageCallback>>();

  constructor() {
    this.subscriber = new Redis(REDIS_URL);
    this.subscriber.on("message", (channel: string, message: string) => {
      const callbacks = this.listeners.get(channel);
      if (callbacks) {
        for (const cb of callbacks) {
          try {
            cb(message);
          } catch {
            /* listener error should not crash hub */
          }
        }
      }
    });
  }

  async subscribe(channel: string, callback: MessageCallback): Promise<void> {
    let callbacks = this.listeners.get(channel);
    if (!callbacks) {
      callbacks = new Set();
      this.listeners.set(channel, callbacks);
      await this.subscriber.subscribe(channel);
    }
    callbacks.add(callback);
  }

  async unsubscribe(
    channel: string,
    callback: MessageCallback
  ): Promise<void> {
    const callbacks = this.listeners.get(channel);
    if (!callbacks) return;
    callbacks.delete(callback);
    if (callbacks.size === 0) {
      this.listeners.delete(channel);
      await this.subscriber.unsubscribe(channel);
    }
  }
}

function getHub(): PubSubHub {
  if (!globalForPubSub.pubsubHub) {
    globalForPubSub.pubsubHub = new PubSubHub();
  }
  return globalForPubSub.pubsubHub;
}

export function chatGroupChannel(chatGroupId: string): string {
  return `chatgroup:${chatGroupId}:messages`;
}

export async function publishMessage(
  chatGroupId: string,
  payload: Record<string, unknown>
): Promise<void> {
  console.log("[PUBSUB] publishMessage to", chatGroupId, "payload:", JSON.stringify(payload).slice(0, 200));
  const publisher = getPublisher();
  const channel = chatGroupChannel(chatGroupId);
  await publisher.publish(channel, JSON.stringify(payload));
}

export async function subscribeToChatGroup(
  chatGroupId: string,
  callback: MessageCallback
): Promise<() => Promise<void>> {
  const hub = getHub();
  const channel = chatGroupChannel(chatGroupId);
  await hub.subscribe(channel, callback);
  return async () => {
    await hub.unsubscribe(channel, callback);
  };
}

export function robotChannel(robotId: string): string {
  return `robot:${robotId}:messages`;
}

export async function publishToRobot(
  robotId: string,
  payload: Record<string, unknown>
): Promise<void> {
  console.log("[PUBSUB] publishToRobot", robotId, "payload:", JSON.stringify(payload).slice(0, 200));
  const publisher = getPublisher();
  const channel = robotChannel(robotId);
  await publisher.publish(channel, JSON.stringify(payload));
}

export async function subscribeToRobot(
  robotId: string,
  callback: MessageCallback
): Promise<() => Promise<void>> {
  const hub = getHub();
  const channel = robotChannel(robotId);
  await hub.subscribe(channel, callback);
  return async () => {
    await hub.unsubscribe(channel, callback);
  };
}
