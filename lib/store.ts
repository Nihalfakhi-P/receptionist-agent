import { Redis } from "@upstash/redis";
import { BusinessData, DEFAULT_BUSINESS } from "./business";

const KEY = "business:data";

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

// In-memory fallback so `next dev` works before Redis is configured.
// NOT durable on Vercel (each serverless invocation may be a fresh instance).
let memory: BusinessData | null = null;

export async function getBusinessData(): Promise<BusinessData> {
  const redis = getRedis();
  if (redis) {
    const data = await redis.get<BusinessData>(KEY);
    if (data) return data;
    return DEFAULT_BUSINESS;
  }
  return memory ?? DEFAULT_BUSINESS;
}

export async function saveBusinessData(data: BusinessData): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.set(KEY, data);
  } else {
    memory = data;
  }
}

/** Minimal shape validation for the admin PUT endpoint. */
export function validateBusinessData(input: unknown): string | null {
  if (typeof input !== "object" || input === null) return "Body must be a JSON object.";
  const d = input as Partial<BusinessData>;
  if (!d.name || typeof d.name !== "string") return "`name` (string) is required.";
  if (!d.greeting || typeof d.greeting !== "string") return "`greeting` (string) is required.";
  if (typeof d.hours !== "object" || d.hours === null) return "`hours` (object) is required.";
  if (typeof d.fees !== "object" || d.fees === null) return "`fees` (object) is required.";
  if (!Array.isArray(d.faqs)) return "`faqs` (array) is required.";
  if (!Array.isArray(d.resources)) return "`resources` (array) is required.";
  if (!Array.isArray(d.announcements)) return "`announcements` (array) is required.";
  for (const r of d.resources) {
    if (!r.id || !r.label) return "Every resource needs `id` and `label`.";
    if (typeof r.capacity !== "number" || typeof r.available !== "number")
      return "Every resource needs numeric `capacity` and `available`.";
  }
  return null;
}
