import { createClient } from "redis";
import IORedis from "ioredis";
const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const client = createClient({ url: redisUrl });
client.on("error", (err) => console.log("Redis Client Error", err));
client.on("connect", () => console.log("Redis Client Connected"));
// for bull queue
export const bullConnection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
// for caching
export const redisClient = client;
export const connectRedis = async () => await client.connect();
