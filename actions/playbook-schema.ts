import { z } from "zod";

export const growthPlaybookSchema = z.object({
  companyName: z.string().min(2),
  oneLiner: z.string().min(12).describe("What the company does in one sentence"),
  thePlay: z
    .string()
    .min(24)
    .describe("The core growth strategy or play that best explains how the company grew"),
  whyItWorked: z
    .string()
    .min(24)
    .describe("The mechanism that made the growth play effective"),
  firstMoves: z
    .array(z.string().min(12))
    .min(3)
    .max(5)
    .describe("3-5 highly specific, concrete actions they took first"),
  growthEngine: z
    .string()
    .min(24)
    .describe("How the strategy compounded into a repeatable growth engine"),
  evidenceLinks: z
    .array(z.string().url())
    .min(1)
    .describe("The URLs from the provided text that back up these claims")
});

export type GrowthPlaybook = z.infer<typeof growthPlaybookSchema>;

export type ExaMention = {
  title: string | null;
  url: string;
  text: string;
  relevanceScore: number; // higher = more relevant
};

export type PlaybookScorecard = {
  depth: number;
  quality: number;
  actionability: number;
  overall: number;
};

export type PlaybookVotes = {
  upvotes: number;
  downvotes: number;
  score: number;
};

export type PlaybookResult = {
  fetchedCount: number;   // how many Exa returned
  droppedCount: number;   // how many were filtered out
  mentions: ExaMention[]; // the kept ones (top 10)
  playbook: GrowthPlaybook;
};

export type GenerateGrowthPlaybookResult = {
  playbook: GrowthPlaybook;
  sourceCount: number;
  savedId: string | null;
  savedSlug: string | null;
  scorecard: PlaybookScorecard;
  fromCache: boolean;
  promptVersion: string;
};

export type PlaybookArchiveItem = {
  id: string;
  slug: string;
  startupName: string;
  companyName: string;
  oneLiner: string;
  thePlay: string;
  whyItWorked: string;
  firstMoves: string[];
  growthEngine: string;
  evidenceLinks: string[];
  sourceCount: number;
  scorecard: PlaybookScorecard;
  votes: PlaybookVotes;
  createdAt: string;
  updatedAt: string;
  promptVersion: string;
};
