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
  createdAt?: Date;
  updatedAt?: Date;
};

function clampScore(value: number) {
  return Math.max(1, Math.min(10, Math.round(value)));
}

function slugify(value: string) {
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
      playbook.topTactics.filter((tactic) => /\d|experiment|launch|build|use|run|measure|acquire|optimi/i.test(tactic)).length *
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
    `${document.startupSlug ?? slugify(document.startupName)}-${document._id
      .toString()
      .slice(-6)}`;
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
    createdAt: (document.createdAt ?? new Date()).toISOString()
  };
}

async function ensureStoredSlug(
  collection: Collection<StoredPlaybookDocument>,
  document: StoredPlaybookDocument
) {
  if (!document._id) {
    throw new Error("Stored playbook document is missing _id.");
  }

  if (document.slug) {
    return document.slug;
  }

  const slug = `${document.startupSlug ?? slugify(document.startupName)}-${document._id
    .toString()
    .slice(-6)}`;

  await collection.updateOne(
    { _id: document._id },
    {
      $set: {
        slug,
        updatedAt: new Date()
      }
    }
  );

  return slug;
}

export async function saveGrowthPlaybookRun({
  startupName,
  playbook,
  mentions
}: SaveGrowthPlaybookRunInput) {
  const client = await getMongoClient();
  const collection = client
    .db("growthStory")
    .collection<StoredPlaybookDocument>("growthPlaybooks");
  const now = new Date();
  const scorecard = evaluatePlaybook(playbook, mentions);
  const result = await collection.insertOne({
    startupName,
    startupSlug: slugify(startupName),
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
    createdAt: now,
    updatedAt: now
  });
  const insertedId = result.insertedId.toString();
  const slug = `${slugify(startupName)}-${insertedId.slice(-6)}`;

  await collection.updateOne(
    { _id: result.insertedId },
    {
      $set: {
        slug,
        updatedAt: now
      }
    }
  );

  return {
    id: insertedId,
    slug,
    scorecard
  };
}

export async function getPlaybookArchive() {
  const client = await getMongoClient();
  const collection = client
    .db("growthStory")
    .collection<StoredPlaybookDocument>("growthPlaybooks");
  const documents = await collection.find({}).toArray();

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

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
}

export async function getPlaybookBySlug(slug: string) {
  const client = await getMongoClient();
  const collection = client
    .db("growthStory")
    .collection<StoredPlaybookDocument>("growthPlaybooks");
  let document = await collection.findOne({ slug });

  if (!document) {
    const documents = await collection.find({}).toArray();
    document =
      documents.find(
        (candidate) =>
          `${candidate.startupSlug ?? slugify(candidate.startupName)}-${candidate._id
            .toString()
            .slice(-6)}` === slug
      ) ?? null;
  }

  if (!document) {
    return null;
  }

  document.slug = await ensureStoredSlug(collection, document);

  return normalizeStoredPlaybook(document);
}

export async function voteForPlaybook(slug: string, direction: "up" | "down") {
  const client = await getMongoClient();
  const collection = client
    .db("growthStory")
    .collection<StoredPlaybookDocument>("growthPlaybooks");
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
