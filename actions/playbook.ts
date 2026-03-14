"use server";

import { revalidatePath } from "next/cache";
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import Exa from "exa-js";
import { z } from "zod";
import {
  growthPlaybookSchema,
  type ExaMention,
  type GenerateGrowthPlaybookResult,
  type GrowthPlaybook
} from "./playbook-schema";
import {
  getCachedPlaybookByStartupName,
  getPlaybookBySlug,
  saveGrowthPlaybookRun,
  voteForPlaybook
} from "../lib/playbook-runs";

const startupNameSchema = z
  .string()
  .trim()
  .min(2, "Enter a startup name with at least 2 characters.");

const MAX_RESULTS_TO_FETCH = 15;
const MAX_RESULTS_FOR_GPT = 10;
const PLAYBOOK_PROMPT_VERSION = "2026-03-14-v1";

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

function scoreRelevance(
  parsedNameLower: string,
  mention: Omit<ExaMention, "relevanceScore">
): number {
  const titleText = (mention.title ?? "").toLowerCase();
  const bodyText = mention.text.toLowerCase();
  const escapedName = parsedNameLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const titleHits = (titleText.match(new RegExp(escapedName, "g")) ?? []).length;
  const bodyHits = (bodyText.match(new RegExp(escapedName, "g")) ?? []).length;
  const titleScore = titleHits * 2;
  const bodyScore = Math.min(bodyHits, 20);
  const lengthBonus =
    mention.text.length > 3000 ? 3 : mention.text.length > 1500 ? 2 : mention.text.length > 500 ? 1 : 0;

  return titleScore + bodyScore + lengthBonus;
}

export async function fetchStartupMentions(startupName: string): Promise<{
  allMentions: ExaMention[];
  keptMentions: ExaMention[];
}> {
  const parsedName = startupNameSchema.parse(startupName);
  const nameLower = parsedName.toLowerCase();
  const exa = getExaClient();

  const response = await exa.searchAndContents(
    `"${parsedName}" growth strategy how they acquired users`,
    {
      type: "keyword",
      numResults: MAX_RESULTS_TO_FETCH,
      text: { maxCharacters: 5000 }
    }
  );

  const allMentions: ExaMention[] = response.results
    .filter(
      (result) =>
        typeof result.url === "string" &&
        typeof result.text === "string" &&
        result.text.trim().length > 0
    )
    .map((result) => {
      const base = {
        title: typeof result.title === "string" ? result.title : null,
        url: result.url as string,
        text: (result.text as string).trim()
      };

      return {
        ...base,
        relevanceScore: scoreRelevance(nameLower, base)
      };
    })
    .sort((a, b) => b.relevanceScore - a.relevanceScore);

  const keptMentions = allMentions
    .filter((mention) => mention.relevanceScore > 0)
    .slice(0, MAX_RESULTS_FOR_GPT);

  if (keptMentions.length === 0) {
    throw new Error(
      `No articles mentioning "${parsedName}" were found. Check the spelling or try the full company name.`
    );
  }

  return { allMentions, keptMentions };
}

async function buildGrowthPlaybook(
  startupName: string
): Promise<GenerateGrowthPlaybookResult> {
  ensureOpenAIKey();

  const parsedName = startupNameSchema.parse(startupName);
  const { keptMentions } = await fetchStartupMentions(parsedName);
  const allowedLinks = new Set(keptMentions.map((mention) => mention.url));
  const combinedMentions = keptMentions
    .map((mention) => `Source: ${mention.url}\n\nContent: ${mention.text}`)
    .join("\n\n---\n\n");

  const { object } = await generateObject({
    model: openai("gpt-5.2"),
    schema: growthPlaybookSchema,
    system:
      "You are an expert growth marketer. Read the provided web excerpts and reverse-engineer the growth strategy for the specific startup named in the prompt. Be specific and actionable. Only describe strategies explicitly mentioned in the excerpts. Do not hallucinate or assume. If the excerpts don't clearly describe the named company's strategy, say so in oneLiner.",
    prompt: [
      `Startup: ${parsedName}`,
      `You have been given ${keptMentions.length} high-relevance articles. Use ONLY these excerpts. Do not rely on prior knowledge.`,
      "Return evidenceLinks only from the Source URLs listed in the excerpts.",
      combinedMentions
    ].join("\n\n")
  });

  const playbook: GrowthPlaybook = {
    ...object,
    companyName: object.companyName || parsedName,
    evidenceLinks: object.evidenceLinks.filter((link) => allowedLinks.has(link))
  };

  const savedRun = await saveGrowthPlaybookRun({
    startupName: parsedName,
    playbook,
    mentions: keptMentions,
    promptVersion: PLAYBOOK_PROMPT_VERSION
  });

  return {
    playbook,
    sourceCount: keptMentions.length,
    savedId: savedRun.id,
    savedSlug: savedRun.slug,
    scorecard: savedRun.scorecard,
    fromCache: false,
    promptVersion: PLAYBOOK_PROMPT_VERSION
  };
}

export async function generateGrowthPlaybook(
  startupName: string
): Promise<GenerateGrowthPlaybookResult> {
  const parsedName = startupNameSchema.parse(startupName);
  const cached = await getCachedPlaybookByStartupName(parsedName);

  if (cached) {
    return {
      playbook: {
        companyName: cached.companyName,
        oneLiner: cached.oneLiner,
        primaryGrowthChannel: cached.primaryGrowthChannel,
        topTactics: cached.topTactics,
        evidenceLinks: cached.evidenceLinks
      },
      sourceCount: cached.sourceCount,
      savedId: cached.id,
      savedSlug: cached.slug,
      scorecard: cached.scorecard,
      fromCache: true,
      promptVersion: cached.promptVersion
    };
  }

  return buildGrowthPlaybook(parsedName);
}

export async function refreshGrowthPlaybook(slug: string) {
  const existing = await getPlaybookBySlug(slug);

  if (!existing) {
    throw new Error("Playbook not found.");
  }

  const refreshed = await buildGrowthPlaybook(existing.startupName);

  revalidatePath("/playbooks");
  revalidatePath(`/playbooks/${existing.slug}`);
  revalidatePath("/growth-playbook");

  return refreshed;
}

export async function votePlaybook(slug: string, direction: "up" | "down") {
  await voteForPlaybook(slug, direction);
  revalidatePath("/playbooks");
  revalidatePath(`/playbooks/${slug}`);
}
