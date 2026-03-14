import { Collection, ObjectId } from "mongodb";
import type {
  ExaMention,
  GrowthPlaybook,
  PlaybookArchiveItem,
  PlaybookScorecard,
  PlaybookVotes
} from "../actions/playbook-schema";
import { getMongoClient } from "./mongodb";

type SaveGrowthPlaybookRunInput = {
  startupName: string;
  playbook: GrowthPlaybook;
  mentions: ExaMention[];
  promptVersion: string;
};

type StoredPlaybookDocument = {
  _id?: ObjectId;
  slug?: string;
  startupName: string;
  startupSlug?: string;
  playbook: GrowthPlaybook;
  sourceCount: number;
  sources: Array<{
    title: string | null;
    url: string;
    relevanceScore: number;
    excerpt: string;
  }>;
  scorecard?: PlaybookScorecard;
  votes?: PlaybookVotes;
  promptVersion?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

function clampScore(value: number) {
  return Math.max(1, Math.min(10, Math.round(value)));
}

export function slugifyBusiness(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getDomainCount(urls: string[]) {
  const domains = urls.flatMap((url) => {
    try {
      return [new URL(url).hostname.replace(/^www\./, "")];
    } catch {
      return [];
    }
  });

  return new Set(domains).size;
}

export function evaluatePlaybook(
  playbook: GrowthPlaybook,
  mentions: ExaMention[]
): PlaybookScorecard {
  const tacticLengths = playbook.topTactics.map((tactic) =>
    tactic.trim().split(/\s+/).length
  );
  const averageTacticLength =
    tacticLengths.reduce((sum, length) => sum + length, 0) /
    Math.max(tacticLengths.length, 1);
  const domainCount = getDomainCount(playbook.evidenceLinks);
  const averageRelevance =
    mentions.reduce((sum, mention) => sum + mention.relevanceScore, 0) /
    Math.max(mentions.length, 1);

  const depth = clampScore(
    2 +
      mentions.length * 0.55 +
      Math.min(playbook.evidenceLinks.length, 5) * 0.35 +
      domainCount * 0.35 +
      averageTacticLength * 0.09
  );

  const quality = clampScore(
    2 +
      Math.min(playbook.evidenceLinks.length, playbook.topTactics.length) * 0.9 +
      domainCount * 0.55 +
      Math.min(averageRelevance, 12) * 0.22
  );

  const actionability = clampScore(
    2 +
      playbook.topTactics.length * 0.7 +
      averageTacticLength * 0.16 +
      playbook.topTactics.filter((tactic) =>
        /\d|experiment|launch|build|use|run|measure|acquire|optimi/i.test(
          tactic
        )
      ).length *
        0.45
  );

  const overall = clampScore((depth + quality + actionability) / 3);

  return {
    depth,
    quality,
    actionability,
    overall
  };
}

function normalizeVotes(votes?: PlaybookVotes): PlaybookVotes {
  const upvotes = votes?.upvotes ?? 0;
  const downvotes = votes?.downvotes ?? 0;

  return {
    upvotes,
    downvotes,
    score: upvotes - downvotes
  };
}

function normalizeStoredPlaybook(document: StoredPlaybookDocument): PlaybookArchiveItem {
  if (!document._id) {
    throw new Error("Stored playbook document is missing _id.");
  }

  const slug =
    document.slug ??
    document.startupSlug ??
    slugifyBusiness(document.startupName);
  const votes = normalizeVotes(document.votes);

  return {
    id: document._id.toString(),
    slug,
    startupName: document.startupName,
    companyName: document.playbook.companyName || document.startupName,
    oneLiner: document.playbook.oneLiner,
    primaryGrowthChannel: document.playbook.primaryGrowthChannel,
    topTactics: document.playbook.topTactics,
    evidenceLinks: document.playbook.evidenceLinks,
    sourceCount: document.sourceCount,
    scorecard:
      document.scorecard ??
      evaluatePlaybook(
        document.playbook,
        document.sources.map((source) => ({
          title: source.title,
          url: source.url,
          text: source.excerpt,
          relevanceScore: source.relevanceScore
        }))
      ),
    votes,
    createdAt: (document.createdAt ?? new Date()).toISOString(),
    updatedAt: (document.updatedAt ?? document.createdAt ?? new Date()).toISOString(),
    promptVersion: document.promptVersion ?? "legacy"
  };
}

async function getPlaybookCollection() {
  const client = await getMongoClient();

  return client
    .db("growthStory")
    .collection<StoredPlaybookDocument>("growthPlaybooks");
}

async function ensureStoredSlug(
  collection: Collection<StoredPlaybookDocument>,
  document: StoredPlaybookDocument
) {
  if (!document._id) {
    throw new Error("Stored playbook document is missing _id.");
  }

  const nextSlug =
    document.slug ??
    document.startupSlug ??
    slugifyBusiness(document.startupName);

  if (document.slug === nextSlug) {
    return nextSlug;
  }

  await collection.updateOne(
    { _id: document._id },
    {
      $set: {
        slug: nextSlug,
        updatedAt: new Date()
      }
    }
  );

  return nextSlug;
}

async function findLatestByStartupSlug(
  startupSlug: string,
  collection: Collection<StoredPlaybookDocument>
) {
  const documents = await collection
    .find({
      $or: [{ startupSlug }, { slug: startupSlug }]
    })
    .sort({ updatedAt: -1, createdAt: -1 })
    .toArray();

  return documents[0] ?? null;
}

async function dedupeLatestDocuments(collection: Collection<StoredPlaybookDocument>) {
  const documents = await collection
    .find({})
    .sort({ updatedAt: -1, createdAt: -1 })
    .toArray();
  const seen = new Set<string>();

  return documents.filter((document) => {
    const key =
      document.startupSlug ??
      document.slug ??
      slugifyBusiness(document.startupName);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export async function saveGrowthPlaybookRun({
  startupName,
  playbook,
  mentions,
  promptVersion
}: SaveGrowthPlaybookRunInput) {
  const collection = await getPlaybookCollection();
  const now = new Date();
  const startupSlug = slugifyBusiness(startupName);
  const scorecard = evaluatePlaybook(playbook, mentions);
  const existing = await findLatestByStartupSlug(startupSlug, collection);

  if (existing?._id) {
    const nextSlug = existing.slug ?? startupSlug;

    await collection.updateOne(
      { _id: existing._id },
      {
        $set: {
          startupName,
          startupSlug,
          slug: nextSlug,
          playbook,
          sourceCount: mentions.length,
          sources: mentions.map((mention) => ({
            title: mention.title,
            url: mention.url,
            relevanceScore: mention.relevanceScore,
            excerpt: mention.text
          })),
          scorecard,
          promptVersion,
          updatedAt: now
        },
        $setOnInsert: {
          createdAt: now
        }
      }
    );

    return {
      id: existing._id.toString(),
      slug: nextSlug,
      scorecard
    };
  }

  const result = await collection.insertOne({
    startupName,
    startupSlug,
    slug: startupSlug,
    playbook,
    sourceCount: mentions.length,
    sources: mentions.map((mention) => ({
      title: mention.title,
      url: mention.url,
      relevanceScore: mention.relevanceScore,
      excerpt: mention.text
    })),
    scorecard,
    votes: {
      upvotes: 0,
      downvotes: 0,
      score: 0
    },
    promptVersion,
    createdAt: now,
    updatedAt: now
  });

  return {
    id: result.insertedId.toString(),
    slug: startupSlug,
    scorecard
  };
}

export async function getCachedPlaybookByStartupName(startupName: string) {
  const collection = await getPlaybookCollection();
  const startupSlug = slugifyBusiness(startupName);
  const document = await findLatestByStartupSlug(startupSlug, collection);

  if (!document) {
    return null;
  }

  document.slug = await ensureStoredSlug(collection, document);

  return normalizeStoredPlaybook(document);
}

export async function getPlaybookArchive() {
  const collection = await getPlaybookCollection();
  const documents = await dedupeLatestDocuments(collection);

  await Promise.all(
    documents.map(async (document) => {
      document.slug = await ensureStoredSlug(collection, document);
    })
  );

  return documents
    .map(normalizeStoredPlaybook)
    .sort((a, b) => {
      if (b.votes.score !== a.votes.score) {
        return b.votes.score - a.votes.score;
      }

      if (b.scorecard.overall !== a.scorecard.overall) {
        return b.scorecard.overall - a.scorecard.overall;
      }

      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
}

export async function getPlaybookBySlug(slug: string) {
  const collection = await getPlaybookCollection();
  let document = await collection.findOne({ slug });

  if (!document) {
    document = await findLatestByStartupSlug(slug, collection);
  }

  if (!document) {
    return null;
  }

  document.slug = await ensureStoredSlug(collection, document);

  return normalizeStoredPlaybook(document);
}

export async function voteForPlaybook(slug: string, direction: "up" | "down") {
  const collection = await getPlaybookCollection();
  const increment =
    direction === "up"
      ? { "votes.upvotes": 1, "votes.score": 1 }
      : { "votes.downvotes": 1, "votes.score": -1 };

  await collection.updateOne(
    { slug },
    {
      $inc: increment,
      $set: {
        updatedAt: new Date()
      }
    }
  );
}
