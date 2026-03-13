"use server";

import { revalidatePath } from "next/cache";
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import Exa from "exa-js";
import { z } from "zod";
import {
  growthPlaybookSchema,
  type GrowthPlaybook,
  type ExaMention,
  type GenerateGrowthPlaybookResult,
} from "./playbook-schema";
import { saveGrowthPlaybookRun, voteForPlaybook } from "../lib/playbook-runs";

const startupNameSchema = z
  .string()
  .trim()
  .min(2, "Enter a startup name with at least 2 characters.");

const MAX_RESULTS_TO_FETCH = 15; // cast a wide net
const MAX_RESULTS_FOR_GPT = 10; // keep only the best

function getExaClient() {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) throw new Error("Missing EXA_API_KEY.");
  return new Exa(apiKey);
}

function ensureOpenAIKey() {
  if (!process.env.OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY.");
}

/**
 * Score how relevant an article is to the target company.
 *
 * Formula:
 *   - +2 per mention of the company name in the title
 *   - +1 per mention of the company name in the body (capped at 20 so one
 *     repetitive article doesn't dominate)
 *   - +0–3 bonus for article length (more content = more signal)
 */
function scoreRelevance(parsedNameLower: string, mention: Omit<ExaMention, "relevanceScore">): number {
  const titleText = (mention.title ?? "").toLowerCase();
  const bodyText = mention.text.toLowerCase();

  const titleHits = (titleText.match(new RegExp(parsedNameLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) ?? []).length;
  const bodyHits = (bodyText.match(new RegExp(parsedNameLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) ?? []).length;

  const titleScore = titleHits * 2;
  const bodyScore = Math.min(bodyHits, 20);
  const lengthBonus = mention.text.length > 3000 ? 3 : mention.text.length > 1500 ? 2 : mention.text.length > 500 ? 1 : 0;

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
      text: { maxCharacters: 5000 },
    }
  );

  // Score every result, even ones with zero name mentions (so UI can show them as "dropped")
  const allMentions: ExaMention[] = response.results
    .filter(
      (r) =>
        typeof r.url === "string" &&
        typeof r.text === "string" &&
        r.text.trim().length > 0
    )
    .map((r) => {
      const base = {
        title: typeof r.title === "string" ? r.title : null,
        url: r.url as string,
        text: (r.text as string).trim(),
      };
      return { ...base, relevanceScore: scoreRelevance(nameLower, base) };
    })
    .sort((a, b) => b.relevanceScore - a.relevanceScore); // highest score first

  // Keep only results that actually mention the company (score > 0) and cap at MAX_RESULTS_FOR_GPT
  const keptMentions = allMentions
    .filter((m) => m.relevanceScore > 0)
    .slice(0, MAX_RESULTS_FOR_GPT);

  if (keptMentions.length === 0) {
    throw new Error(
      `No articles mentioning "${parsedName}" were found. Check the spelling or try the full company name.`
    );
  }

  return { allMentions, keptMentions };
}

export async function generateGrowthPlaybook(
  startupName: string
): Promise<GenerateGrowthPlaybookResult> {
  ensureOpenAIKey();

  const parsedName = startupNameSchema.parse(startupName);
  const { keptMentions } = await fetchStartupMentions(parsedName);

  const allowedLinks = new Set(keptMentions.map((m) => m.url));
  const combinedMentions = keptMentions
    .map((m) => `Source: ${m.url}\n\nContent: ${m.text}`)
    .join("\n\n---\n\n");

  const { object } = await generateObject({
    model: openai("gpt-5.2"),
    schema: growthPlaybookSchema,
    system:
      "You are an expert growth marketer. Read the provided web excerpts and reverse-engineer the growth strategy for the specific startup named in the prompt. Be specific and actionable. Only describe strategies explicitly mentioned in the excerpts — do not hallucinate or assume. If the excerpts don't clearly describe the named company's strategy, say so in oneLiner.",
    prompt: [
      `Startup: ${parsedName}`,
      `You have been given ${keptMentions.length} high-relevance articles. Use ONLY these excerpts. Do not rely on prior knowledge.`,
      "Return evidenceLinks only from the Source URLs listed in the excerpts.",
      combinedMentions,
    ].join("\n\n"),
  });

  const playbook: GrowthPlaybook = {
    ...object,
    companyName: object.companyName || parsedName,
    evidenceLinks: object.evidenceLinks.filter((link) => allowedLinks.has(link)),
  };

  let savedId: string | null = null;
  let savedSlug: string | null = null;
  const scorecard = {
    depth: 0,
    quality: 0,
    actionability: 0,
    overall: 0
  };

  try {
    const savedRun = await saveGrowthPlaybookRun({
      startupName: parsedName,
      playbook,
      mentions: keptMentions
    });
    savedId = savedRun.id;
    savedSlug = savedRun.slug;
    scorecard.depth = savedRun.scorecard.depth;
    scorecard.quality = savedRun.scorecard.quality;
    scorecard.actionability = savedRun.scorecard.actionability;
    scorecard.overall = savedRun.scorecard.overall;
  } catch (error) {
    console.error("Failed to save growth playbook run", error);
  }

  return {
    playbook,
    sourceCount: keptMentions.length,
    savedId,
    savedSlug,
    scorecard
  };
}

export async function votePlaybook(slug: string, direction: "up" | "down") {
  await voteForPlaybook(slug, direction);
  revalidatePath("/playbooks");
  revalidatePath(`/playbooks/${slug}`);
}
