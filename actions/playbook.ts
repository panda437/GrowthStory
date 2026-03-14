"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  type GenerateGrowthPlaybookResult,
  type GrowthPlaybook
} from "./playbook-schema";
import {
  deletePlaybookBySlug,
  getCachedPlaybookByStartupName,
  getPlaybookBySlug,
  saveGrowthPlaybookRun,
  voteForPlaybook
} from "../lib/playbook-runs";
import { runGrowthPlaybookPipeline, PLAYBOOK_PROMPT_VERSION } from "../lib/playbook-engine";

const startupNameSchema = z
  .string()
  .trim()
  .min(2, "Enter a startup name with at least 2 characters.");

async function buildGrowthPlaybook(
  startupName: string
): Promise<GenerateGrowthPlaybookResult> {
  const parsedName = startupNameSchema.parse(startupName);
  const pipelineResult = await runGrowthPlaybookPipeline(parsedName);
  const playbook: GrowthPlaybook = pipelineResult.playbook;

  const savedRun = await saveGrowthPlaybookRun({
    startupName: parsedName,
    playbook,
    mentions: pipelineResult.mentions,
    promptVersion: PLAYBOOK_PROMPT_VERSION
  });

  return {
    playbook,
    sourceCount: pipelineResult.sourceCount,
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
        thePlay: cached.thePlay,
        whyItWorked: cached.whyItWorked,
        firstMoves: cached.firstMoves,
        growthEngine: cached.growthEngine,
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

export async function deleteGrowthPlaybook(slug: string) {
  const existing = await getPlaybookBySlug(slug);

  if (!existing) {
    throw new Error("Playbook not found.");
  }

  await deletePlaybookBySlug(slug);
  revalidatePath("/playbooks");
  revalidatePath(`/playbooks/${slug}`);
  revalidatePath("/admin/playbooks");
  revalidatePath("/growth-playbook");
}
