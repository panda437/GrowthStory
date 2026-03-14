import { z } from "zod";

export const growthPlaybookSchema = z.object({
  companyName: z.string(),
  oneLiner: z.string().describe("What the company does in one sentence"),
  primaryGrowthChannel: z
    .string()
    .describe("e.g., Programmatic SEO, Viral Loops, Cold Email"),
  topTactics: z
    .array(z.string())
    .min(3)
    .max(5)
    .describe("3-5 highly specific, actionable steps they took to grow"),
  evidenceLinks: z
    .array(z.string())
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
  primaryGrowthChannel: string;
  topTactics: string[];
  evidenceLinks: string[];
  sourceCount: number;
  scorecard: PlaybookScorecard;
  votes: PlaybookVotes;
  createdAt: string;
  updatedAt: string;
  promptVersion: string;
};
