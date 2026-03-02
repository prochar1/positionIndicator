import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

// Vercel KV was deprecated in favor of direct Upstash Redis integration
// Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in Vercel to use this
// If you used Vercel KV integration, it uses KV_REST_API_URL and KV_REST_API_TOKEN
const redisUrl =
  process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const redisToken =
  process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

let redis: Redis | null = null;
if (redisUrl && redisToken) {
  redis = new Redis({
    url: redisUrl,
    token: redisToken,
  });
}

// Fallback memory array if Redis is not configured (e.g., local initial testing)
let memoryLocations: {
  latitude: number;
  longitude: number;
  timestamp: number;
}[] = [];

export async function POST(req: Request) {
  try {
    const data = await req.json();

    if (
      typeof data.latitude !== "number" ||
      typeof data.longitude !== "number" ||
      typeof data.timestamp !== "number"
    ) {
      return NextResponse.json(
        { error: "Invalid data format" },
        { status: 400 },
      );
    }

    // Keep data for 1 day (24 hours = 86400000 ms)
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const oldestAllowedTimestamp = Date.now() - ONE_DAY_MS;

    if (redis) {
      // 1. Add new location to a sorted set partitioned by timestamp score
      const memberData = data;
      await redis.zadd("locations_history", {
        score: data.timestamp,
        member: memberData,
      });

      // 2. Remove items older than 24 hours from the sorted set
      await redis.zremrangebyscore(
        "locations_history",
        "-inf",
        oldestAllowedTimestamp,
      );

      return NextResponse.json(
        { success: true, storage: "redis" },
        { status: 201 },
      );
    } else {
      // In-memory fallback
      memoryLocations.push(data);
      memoryLocations = memoryLocations.filter(
        (loc) => loc.timestamp >= oldestAllowedTimestamp,
      );

      return NextResponse.json(
        { success: true, storage: "memory" },
        { status: 201 },
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to process request", details: String(error) },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const oldestAllowedTimestamp = Date.now() - ONE_DAY_MS;

    if (redis) {
      // Fetch all entries that have a score (timestamp) within the last 24h
      const data = await redis.zrange(
        "locations_history",
        oldestAllowedTimestamp,
        "+inf",
        { byScore: true },
      );
      return NextResponse.json(data);
    } else {
      // In-memory fallback
      const validLocations = memoryLocations.filter(
        (loc) => loc.timestamp >= oldestAllowedTimestamp,
      );
      return NextResponse.json(validLocations);
    }
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
