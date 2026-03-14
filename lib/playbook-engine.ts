import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import Exa from "exa-js";
import { z } from "zod";
import {
  growthPlaybookSchema,
  type ExaMention,
  type GrowthPlaybook
} from "../actions/playbook-schema";

const startupNameSchema = z
  .string()
  .trim()
  .min(2, "Enter a startup name with at least 2 characters.");

const exaSummarySchema = z.object({
  independentSource: z.boolean(),
  discussesGrowth: z.boolean(),
  sourceType: z.string(),
  evidenceStrength: z.enum(["high", "medium", "low"]),
  growthNotes: z.string(),
  tacticKeywords: z.array(z.string()).max(4)
});

type ExaSummary = z.infer<typeof exaSummarySchema>;

type MentionCandidate = ExaMention & {
  hostname: string;
  qualityScore: number;
  sourceType: string;
  evidenceStrength: ExaSummary["evidenceStrength"];
  independentSource: boolean;
  discussesGrowth: boolean;
  tacticKeywords: string[];
};

type RetrievalDiagnostics = {
  fetchedCount: number;
  droppedCount: number;
  keptCount: number;
  uniqueDomainCount: number;
  usedDeepFallback: boolean;
};

const MAX_RESULTS_PER_PASS = 8;
const MAX_RESULTS_FOR_GPT = 8;
const MIN_RESULTS_FOR_SYNTHESIS = 3;
const MIN_UNIQUE_DOMAINS = 2;
export const PLAYBOOK_PROMPT_VERSION = "2026-03-14-v4";

const GENERIC_EXCLUDED_DOMAINS = [
  "facebook.com",
  "instagram.com",
  "tiktok.com",
  "youtube.com",
  "www.youtube.com",
  "x.com",
  "twitter.com",
  "crunchbase.com",
  "pitchbook.com",
  "owler.com",
  "g2.com",
  "capterra.com"
];

const LOW_SIGNAL_HOST_PATTERNS = [
  "agentdock.ai",
  "skillfloor.com",
  "sprintzeal.com",
  "jobaaj.com",
  "blankboard.studio",
  "hnkmedia.com",
  "buildd.co",
  "youngurbanproject.com",
  "marcom.com",
  "webprofits.com.au",
  "markhub24.com"
];

const SEARCH_PASSES = [
  {
    query:
      '"{startup}" how it grew OR growth strategy OR first users OR customer acquisition OR distribution',
    category: "news" as const
  },
  {
    query:
      '"{startup}" founder interview OR podcast OR deep dive OR teardown OR case study growth',
    category: "personal site" as const
  },
  {
    query:
      '"{startup}" word of mouth OR viral OR community OR influencer OR marketplace growth',
    category: undefined
  }
];

function getExaClient() {
  const apiKey = process.env.EXA_API_KEY;

  if (!apiKey) {
    throw new Error("Missing EXA_API_KEY.");
  }

  return new Exa(apiKey);
}

function ensureOpenAIKey() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY.");
  }
}

function parsedNameToSlug(startupName: string) {
  return startupName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function compactSlug(value: string) {
  return value.replace(/-/g, "");
}

function canonicalizeUrl(url: string) {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.replace(/\/+$/, "") || "/";
    return `${parsed.hostname.replace(/^www\./, "")}${pathname}`;
  } catch {
    return url;
  }
}

function getHostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function getStartupExcludedDomains(startupName: string) {
  const slug = parsedNameToSlug(startupName);

  return [
    `${slug}.com`,
    `www.${slug}.com`,
    `${slug}.io`,
    `www.${slug}.io`,
    `${slug}.co`,
    `www.${slug}.co`,
    `${slug}.ai`,
    `www.${slug}.ai`,
    `${slug}.app`,
    `www.${slug}.app`
  ];
}

function isSelfPromotionalContent(url: string, text: string, startupName: string) {
  const hostname = getHostname(url);
  const startupSlug = parsedNameToSlug(startupName);
  const compactStartupSlug = compactSlug(startupSlug);
  const loweredText = text.toLowerCase();
  const promoSignals = [
    "book a demo",
    "start free",
    "sign up",
    "free trial",
    "request a demo",
    "trusted by",
    "contact sales",
    "pricing",
    "features",
    "why choose",
    "get started"
  ];

  if (
    hostname.includes(startupSlug) ||
    hostname.includes(compactStartupSlug) ||
    hostname.includes("careers.") ||
    hostname.includes("help.")
  ) {
    return true;
  }

  return promoSignals.filter((signal) => loweredText.includes(signal)).length >= 2;
}

function parseExaSummary(rawSummary: unknown): ExaSummary {
  const normalizedInput =
    typeof rawSummary === "string"
      ? (() => {
          try {
            return JSON.parse(rawSummary) as Record<string, unknown>;
          } catch {
            return { growthNotes: rawSummary };
          }
        })()
      : rawSummary;
  const normalizedObject =
    normalizedInput && typeof normalizedInput === "object"
      ? {
          ...(normalizedInput as Record<string, unknown>),
          evidenceStrength:
            (normalizedInput as Record<string, unknown>).evidenceStrength === "strong"
              ? "high"
              : (normalizedInput as Record<string, unknown>).evidenceStrength === "moderate"
                ? "medium"
                : (normalizedInput as Record<string, unknown>).evidenceStrength === "weak"
                  ? "low"
                  : (normalizedInput as Record<string, unknown>).evidenceStrength
        }
      : normalizedInput;
  const parsed = exaSummarySchema.safeParse(normalizedObject);

  if (parsed.success) {
    return parsed.data;
  }

  return {
    independentSource: false,
    discussesGrowth: false,
    sourceType: "unknown",
    evidenceStrength: "low",
    growthNotes: "",
    tacticKeywords: []
  };
}

function scoreRelevance(parsedNameLower: string, title: string | null, bodyText: string) {
  const titleText = (title ?? "").toLowerCase();
  const escapedName = parsedNameLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const titleHits = (titleText.match(new RegExp(escapedName, "g")) ?? []).length;
  const bodyHits = (bodyText.toLowerCase().match(new RegExp(escapedName, "g")) ?? []).length;

  return titleHits * 2 + Math.min(bodyHits, 20);
}

function scoreSourceQuality(
  startupName: string,
  url: string,
  title: string | null,
  summary: ExaSummary,
  bodyText: string
) {
  const hostname = getHostname(url);
  const titleLower = (title ?? "").toLowerCase();
  const bodyLower = bodyText.toLowerCase();
  const startupSlug = parsedNameToSlug(startupName);
  const startupCompact = compactSlug(startupSlug);
  let score = 0;

  if (summary.independentSource) score += 3;
  if (summary.discussesGrowth) score += 3;
  if (summary.evidenceStrength === "high") score += 3;
  if (summary.evidenceStrength === "medium") score += 1;

  if (
    hostname.includes("firstround.com") ||
    hostname.includes("substack.com") ||
    hostname.includes("indiehackers.com") ||
    hostname.includes("law.com") ||
    hostname.includes("medium.com") ||
    hostname.includes("cnbc.com")
  ) {
    score += 2;
  }

  if (
    hostname.includes("linkedin.com") ||
    hostname.includes("ycombinator.com") ||
    hostname.includes("mixergy.com")
  ) {
    score -= 1;
  }

  if (LOW_SIGNAL_HOST_PATTERNS.some((pattern) => hostname.includes(pattern))) {
    score -= 5;
  }

  if (titleLower.includes("marketing strategy") || titleLower.includes("case study")) {
    score -= hostname.includes("firstround.com") || hostname.includes("substack.com") ? 0 : 2;
  }

  if (
    hostname.includes(startupSlug) ||
    hostname.includes(startupCompact) ||
    bodyLower.includes("book a demo") ||
    bodyLower.includes("request a demo")
  ) {
    score -= 6;
  }

  if (summary.growthNotes.length >= 120) score += 1;
  if (summary.tacticKeywords.length >= 2) score += 1;

  return score;
}

function getUniqueDomainCount(mentions: MentionCandidate[]) {
  return new Set(mentions.map((mention) => mention.hostname)).size;
}

function buildEvidenceText(summary: ExaSummary, highlights: string, text: string) {
  return [
    summary.growthNotes ? `Exa structured summary: ${summary.growthNotes}` : "",
    highlights ? `Relevant excerpts:\n${highlights}` : "",
    text ? `Source body excerpt:\n${text}` : ""
  ]
    .filter((value) => value.length > 0)
    .join("\n\n")
    .trim();
}

async function runRegularSearchPass(
  exa: Exa,
  startupName: string,
  queryTemplate: string,
  category?: "news" | "personal site"
) {
  const query = queryTemplate.replaceAll("{startup}", startupName);

  return exa.searchAndContents(query, {
    type: "auto",
    numResults: MAX_RESULTS_PER_PASS,
    category,
    text: {
      maxCharacters: 2200,
      verbosity: "compact",
      includeSections: ["body"],
      excludeSections: ["header", "navigation", "sidebar", "footer", "metadata", "banner"]
    },
    highlights: {
      query: `${startupName} growth strategy customer acquisition first users distribution referrals word of mouth partnerships`,
      maxCharacters: 900
    },
    summary: {
      query: `Return only third-party evidence about how ${startupName} acquired users, distributed, grew, or compounded growth. Ignore product descriptions, homepage copy, fundraising fluff, and generic marketing advice.`,
      schema: exaSummarySchema
    },
    excludeDomains: [
      ...GENERIC_EXCLUDED_DOMAINS,
      ...getStartupExcludedDomains(startupName)
    ],
    excludeText: ["book a demo"],
    maxAgeHours: 0
  });
}

async function runDeepFallback(exa: Exa, startupName: string) {
  return exa.searchAndContents(`"${startupName}" growth strategy`, {
    type: "deep",
    numResults: 10,
    additionalQueries: [
      `"${startupName}" founder interview growth`,
      `"${startupName}" case study growth marketing`,
      `"${startupName}" first users distribution`,
      `"${startupName}" word of mouth referrals`,
      `"${startupName}" community growth`
    ],
    text: {
      maxCharacters: 2200,
      verbosity: "compact",
      includeSections: ["body"],
      excludeSections: ["header", "navigation", "sidebar", "footer", "metadata", "banner"]
    },
    highlights: {
      query: `${startupName} growth distribution acquisition tactics`,
      maxCharacters: 900
    },
    summary: {
      query: `Return only third-party evidence about how ${startupName} acquired users, distributed, or compounded growth. Ignore homepage copy, funding announcements, and generic product descriptions.`,
      schema: exaSummarySchema
    },
    excludeDomains: [
      ...GENERIC_EXCLUDED_DOMAINS,
      ...getStartupExcludedDomains(startupName)
    ],
    maxAgeHours: 0
  });
}

function normalizeSearchResults(
  startupName: string,
  results: Array<Record<string, unknown>>
) {
  const parsedNameLower = startupName.toLowerCase();
  const deduped = new Map<string, MentionCandidate>();

  for (const result of results) {
    if (typeof result.url !== "string") {
      continue;
    }

    const summary = parseExaSummary(result.summary);
    const text = typeof result.text === "string" ? result.text.trim() : "";
    const highlights = Array.isArray(result.highlights)
      ? result.highlights.filter((value): value is string => typeof value === "string").join("\n")
      : "";
    const evidenceText = buildEvidenceText(summary, highlights, text);

    if (
      evidenceText.length === 0 ||
      isSelfPromotionalContent(result.url, evidenceText, startupName) ||
      !summary.discussesGrowth ||
      !summary.independentSource
    ) {
      continue;
    }

    const title = typeof result.title === "string" ? result.title : null;
    const qualityScore = scoreSourceQuality(startupName, result.url, title, summary, evidenceText);
    const relevanceScore = scoreRelevance(parsedNameLower, title, evidenceText) + qualityScore;

    if (qualityScore < 0 || relevanceScore <= 0) {
      continue;
    }

    const candidate: MentionCandidate = {
      title,
      url: result.url,
      text: evidenceText,
      relevanceScore,
      hostname: getHostname(result.url),
      qualityScore,
      sourceType: summary.sourceType,
      evidenceStrength: summary.evidenceStrength,
      independentSource: summary.independentSource,
      discussesGrowth: summary.discussesGrowth,
      tacticKeywords: summary.tacticKeywords
    };
    const key = canonicalizeUrl(result.url);
    const existing = deduped.get(key);

    if (!existing || candidate.relevanceScore > existing.relevanceScore) {
      deduped.set(key, candidate);
    }
  }

  return [...deduped.values()].sort((a, b) => b.relevanceScore - a.relevanceScore);
}

function shouldUseDeepFallback(mentions: MentionCandidate[]) {
  const uniqueDomainCount = getUniqueDomainCount(mentions);
  const highSignalCount = mentions.filter(
    (mention) =>
      mention.evidenceStrength === "high" &&
      mention.qualityScore >= 4
  ).length;

  return uniqueDomainCount < MIN_UNIQUE_DOMAINS || highSignalCount < MIN_RESULTS_FOR_SYNTHESIS;
}

function assertEvidenceSet(startupName: string, mentions: MentionCandidate[]) {
  const uniqueDomainCount = getUniqueDomainCount(mentions);

  if (mentions.length < MIN_RESULTS_FOR_SYNTHESIS || uniqueDomainCount < MIN_UNIQUE_DOMAINS) {
    throw new Error(
      `Not enough independent third-party coverage was found for "${startupName}". GrowthStory skipped the company instead of generating a weak result.`
    );
  }
}

function validatePlaybookOutput(
  startupName: string,
  playbook: GrowthPlaybook,
  mentions: MentionCandidate[]
) {
  const allowedLinks = new Set(mentions.map((mention) => mention.url));
  const filteredPlaybook = growthPlaybookSchema.parse({
    ...playbook,
    companyName: playbook.companyName || startupName,
    evidenceLinks: playbook.evidenceLinks.filter((link) => allowedLinks.has(link))
  });
  const independentEvidenceCount = new Set(
    filteredPlaybook.evidenceLinks.map((link) => getHostname(link))
  ).size;

  if (independentEvidenceCount < MIN_UNIQUE_DOMAINS) {
    throw new Error(
      `The evidence set for "${startupName}" was too repetitive or weak to support a trustworthy playbook.`
    );
  }

  return filteredPlaybook;
}

export async function fetchStartupMentions(startupName: string): Promise<{
  allMentions: MentionCandidate[];
  keptMentions: MentionCandidate[];
  diagnostics: RetrievalDiagnostics;
}> {
  const parsedName = startupNameSchema.parse(startupName);
  const exa = getExaClient();

  const passResponses = await Promise.all(
    SEARCH_PASSES.map((pass) =>
      runRegularSearchPass(exa, parsedName, pass.query, pass.category)
    )
  );

  let allMentions = normalizeSearchResults(
    parsedName,
    passResponses.flatMap((response) => response.results as Array<Record<string, unknown>>)
  );
  let usedDeepFallback = false;

  if (shouldUseDeepFallback(allMentions)) {
    const deepResponse = await runDeepFallback(exa, parsedName);
    allMentions = normalizeSearchResults(
      parsedName,
      [
        ...passResponses.flatMap((response) => response.results as Array<Record<string, unknown>>),
        ...(deepResponse.results as Array<Record<string, unknown>>)
      ]
    );
    usedDeepFallback = true;
  }

  const keptMentions = allMentions.slice(0, MAX_RESULTS_FOR_GPT);
  assertEvidenceSet(parsedName, keptMentions);

  return {
    allMentions,
    keptMentions,
    diagnostics: {
      fetchedCount: passResponses.reduce(
        (sum, response) => sum + response.results.length,
        0
      ),
      droppedCount: Math.max(allMentions.length - keptMentions.length, 0),
      keptCount: keptMentions.length,
      uniqueDomainCount: getUniqueDomainCount(keptMentions),
      usedDeepFallback
    }
  };
}

export async function runGrowthPlaybookPipeline(startupName: string): Promise<{
  startupName: string;
  playbook: GrowthPlaybook;
  mentions: ExaMention[];
  sourceCount: number;
  promptVersion: string;
  diagnostics: RetrievalDiagnostics;
}> {
  ensureOpenAIKey();

  const parsedName = startupNameSchema.parse(startupName);
  const { keptMentions, diagnostics } = await fetchStartupMentions(parsedName);
  const combinedMentions = keptMentions
    .map(
      (mention) =>
        [
          `Source: ${mention.url}`,
          `Title: ${mention.title ?? "Untitled"}`,
          `Evidence strength: ${mention.evidenceStrength}`,
          `Source type: ${mention.sourceType}`,
          `Tactic hints: ${mention.tacticKeywords.join(", ") || "none"}`,
          "",
          mention.text
        ].join("\n")
    )
    .join("\n\n---\n\n");

  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: growthPlaybookSchema,
    system:
      "You are an expert growth marketer. Read the provided third-party evidence bundle and reverse-engineer the startup's growth strategy from outside-in reporting. Treat founder posts, launch announcements, and funding coverage as weak evidence unless independent sources corroborate them. Prefer observed tactics over inferred narratives. If the evidence does not support a confident claim, keep the claim narrow and concrete rather than embellishing it.",
    prompt: [
      `Startup: ${parsedName}`,
      `You have ${keptMentions.length} pre-qualified independent sources spanning ${diagnostics.uniqueDomainCount} unique domains.`,
      "Rules:",
      "- Use only the evidence bundle below.",
      "- Prioritize observed tactics, experiments, channels, and compounding loops.",
      "- Do not infer a sophisticated growth engine from funding announcements or product descriptions alone.",
      "- firstMoves must be concrete, ordered, and operational.",
      "- Every major claim should be supported by at least one evidence link.",
      "- Return only evidenceLinks from the listed Source URLs.",
      combinedMentions
    ].join("\n\n")
  });

  return {
    startupName: parsedName,
    playbook: validatePlaybookOutput(parsedName, object, keptMentions),
    mentions: keptMentions,
    sourceCount: keptMentions.length,
    promptVersion: PLAYBOOK_PROMPT_VERSION,
    diagnostics
  };
}
