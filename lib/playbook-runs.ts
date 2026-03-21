import { Collection, ObjectId } from "mongodb";
import type {
  ExaMention,
  GrowthPlaybook,
  PlaybookArchiveItem,
  PlaybookVotes
} from "../actions/playbook-schema";
import type { PlaybookScorecard } from "../actions/playbook-schema";
import { evaluatePlaybook } from "./playbook-evaluation";
import { getMongoClient } from "./mongodb";

type SaveGrowthPlaybookRunInput = {
  startupName: string;
  playbook: GrowthPlaybook;
  mentions: ExaMention[];
  promptVersion: string;
};

type LegacyStoredPlaybook = Partial<GrowthPlaybook> & {
  companyName?: string;
  oneLiner?: string;
  primaryGrowthChannel?: string;
  topTactics?: string[];
  evidenceLinks?: string[];
};

type StoredPlaybookDocument = {
  _id?: ObjectId;
  slug?: string;
  startupName: string;
  startupSlug?: string;
  playbook: LegacyStoredPlaybook;
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

export function slugifyBusiness(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeLegacyPlaybook(playbook: LegacyStoredPlaybook): GrowthPlaybook {
  const legacyChannel =
    typeof playbook.primaryGrowthChannel === "string"
      ? playbook.primaryGrowthChannel
      : "";
  const legacyTactics = Array.isArray(playbook.topTactics)
    ? playbook.topTactics.filter((value): value is string => typeof value === "string")
    : [];

  return {
    companyName:
      typeof playbook.companyName === "string" ? playbook.companyName : "",
    oneLiner: typeof playbook.oneLiner === "string" ? playbook.oneLiner : "",
    thePlay:
      typeof playbook.thePlay === "string" && playbook.thePlay.trim().length > 0
        ? playbook.thePlay
        : legacyChannel,
    whyItWorked:
      typeof playbook.whyItWorked === "string" && playbook.whyItWorked.trim().length > 0
        ? playbook.whyItWorked
        : "Independent evidence is limited, so this mechanism should be treated as a working hypothesis.",
    firstMoves:
      Array.isArray(playbook.firstMoves) && playbook.firstMoves.length > 0
        ? playbook.firstMoves.filter((value): value is string => typeof value === "string")
        : legacyTactics,
    growthEngine:
      typeof playbook.growthEngine === "string" && playbook.growthEngine.trim().length > 0
        ? playbook.growthEngine
        : "The archived result predates the newer structure, so the compounding engine was not captured explicitly.",
    evidenceLinks: Array.isArray(playbook.evidenceLinks)
      ? playbook.evidenceLinks.filter((value): value is string => typeof value === "string")
      : []
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
  const normalizedPlaybook = normalizeLegacyPlaybook(document.playbook);

  return {
    id: document._id.toString(),
    slug,
    startupName: document.startupName,
    companyName: normalizedPlaybook.companyName || document.startupName,
    oneLiner: normalizedPlaybook.oneLiner,
    thePlay: normalizedPlaybook.thePlay,
    whyItWorked: normalizedPlaybook.whyItWorked,
    firstMoves: normalizedPlaybook.firstMoves,
    growthEngine: normalizedPlaybook.growthEngine,
    evidenceLinks: normalizedPlaybook.evidenceLinks,
    sourceCount: document.sourceCount,
    scorecard:
      document.scorecard ??
      evaluatePlaybook(
        normalizedPlaybook,
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

export async function deletePlaybookBySlug(slug: string) {
  const collection = await getPlaybookCollection();
  await collection.deleteOne({ slug });
}

export async function getRelatedPlaybooks(
  currentSlug: string,
  limit = 3
): Promise<PlaybookArchiveItem[]> {
  const collection = await getPlaybookCollection();
  const documents = await dedupeLatestDocuments(collection);

  await Promise.all(
    documents.map(async (document) => {
      document.slug = await ensureStoredSlug(collection, document);
    })
  );

  const all = documents.map(normalizeStoredPlaybook);
  const current = all.find((item) => item.slug === currentSlug);

  if (!current) return [];

  // Build a keyword set from the current playbook's key fields
  const currentWords = new Set(
    `${current.thePlay} ${current.growthEngine}`
      .toLowerCase()
      .split(/\W+/)
      .filter((word) => word.length > 4)
  );

  const scored = all
    .filter((item) => item.slug !== currentSlug)
    .map((item) => {
      const itemWords = `${item.thePlay} ${item.growthEngine}`
        .toLowerCase()
        .split(/\W+/)
        .filter((word) => word.length > 4);
      const overlap = itemWords.filter((word) => currentWords.has(word)).length;
      return { item, overlap };
    })
    .filter(({ overlap }) => overlap > 0)
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, limit)
    .map(({ item }) => item);

  return scored;
}
