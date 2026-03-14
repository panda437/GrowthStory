import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadEnvConfig } from "@next/env";
import { evaluatePlaybook } from "../lib/playbook-evaluation";
import { runGrowthPlaybookPipeline } from "../lib/playbook-engine";

const defaultStartups = ["Photo.ai", "Cal AI", "Character AI", "Dot & Key"];

loadEnvConfig(process.cwd());

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function nowStamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function main() {
  const startups = process.argv.slice(2).length > 0 ? process.argv.slice(2) : defaultStartups;
  const outputDir = join(process.cwd(), "tmp", "playbook-evals", nowStamp());
  await mkdir(outputDir, { recursive: true });

  const summaryLines = [
    "# GrowthStory evaluation run",
    "",
    `Generated at: ${new Date().toISOString()}`,
    "",
    `Startups: ${startups.join(", ")}`,
    ""
  ];

  for (const startup of startups) {
    try {
      const result = await runGrowthPlaybookPipeline(startup);
      const scorecard = evaluatePlaybook(result.playbook, result.mentions);
      const payload = {
        startup,
        sourceCount: result.sourceCount,
        promptVersion: result.promptVersion,
        diagnostics: result.diagnostics,
        scorecard,
        playbook: result.playbook,
        mentions: result.mentions.map((mention) => ({
          title: mention.title,
          url: mention.url,
          relevanceScore: mention.relevanceScore,
          excerpt: mention.text
        }))
      };

      await writeFile(
        join(outputDir, `${slugify(startup)}.json`),
        `${JSON.stringify(payload, null, 2)}\n`,
        "utf8"
      );

      summaryLines.push(`## ${startup}`);
      summaryLines.push("");
      summaryLines.push(`- Sources: ${result.sourceCount}`);
      summaryLines.push(
        `- Retrieval: kept ${result.diagnostics.keptCount}, unique domains ${result.diagnostics.uniqueDomainCount}, deep fallback ${result.diagnostics.usedDeepFallback ? "yes" : "no"}`
      );
      summaryLines.push(
        `- Scores: depth ${scorecard.depth}/10, quality ${scorecard.quality}/10, actionability ${scorecard.actionability}/10, overall ${scorecard.overall}/10`
      );
      summaryLines.push(`- The Play: ${result.playbook.thePlay}`);
      summaryLines.push(`- Why It Worked: ${result.playbook.whyItWorked}`);
      summaryLines.push(`- First Moves: ${result.playbook.firstMoves.join(" | ")}`);
      summaryLines.push(`- Growth Engine: ${result.playbook.growthEngine}`);
      summaryLines.push(
        `- Evidence: ${result.playbook.evidenceLinks.length > 0 ? result.playbook.evidenceLinks.join(", ") : "None returned"}`
      );
      summaryLines.push("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      summaryLines.push(`## ${startup}`);
      summaryLines.push("");
      summaryLines.push(`- Error: ${message}`);
      summaryLines.push("");
    }
  }

  await writeFile(join(outputDir, "summary.md"), `${summaryLines.join("\n")}\n`, "utf8");
  console.log(outputDir);
}

void main();
