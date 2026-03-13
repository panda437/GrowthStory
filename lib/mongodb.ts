import { MongoClient } from "mongodb";

declare global {
  // eslint-disable-next-line no-var
  var _growthStoryMongoClientPromise: Promise<MongoClient> | undefined;
}

export function getMongoClient() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("Missing MONGODB_URI.");
  }

  if (!global._growthStoryMongoClientPromise) {
    const client = new MongoClient(uri);
    global._growthStoryMongoClientPromise = client.connect();
  }

  return global._growthStoryMongoClientPromise;
}
