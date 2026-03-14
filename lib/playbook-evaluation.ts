import type { ExaMention, GrowthPlaybook, PlaybookScorecard } from "../actions/playbook-schema";

function clampScore(value: number) {
  return Math.max(1, Math.min(10, Math.round(value)));
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
  const moveLengths = playbook.firstMoves.map((move) =>
    move.trim().split(/\s+/).length
  );
  const averageMoveLength =
    moveLengths.reduce((sum, length) => sum + length, 0) /
    Math.max(moveLengths.length, 1);
  const narrativeDepth =
    [playbook.thePlay, playbook.whyItWorked, playbook.growthEngine]
      .map((section) => section.trim().split(/\s+/).length)
      .reduce((sum, length) => sum + length, 0) / 3;
  const domainCount = getDomainCount(playbook.evidenceLinks);
  const averageRelevance =
    mentions.reduce((sum, mention) => sum + mention.relevanceScore, 0) /
    Math.max(mentions.length, 1);

  const depth = clampScore(
    2 +
      mentions.length * 0.55 +
      Math.min(playbook.evidenceLinks.length, 5) * 0.35 +
      domainCount * 0.35 +
      averageMoveLength * 0.06 +
      narrativeDepth * 0.03
  );

  const quality = clampScore(
    2 +
      Math.min(playbook.evidenceLinks.length, playbook.firstMoves.length) * 0.9 +
      domainCount * 0.55 +
      Math.min(averageRelevance, 12) * 0.22 +
      [playbook.thePlay, playbook.whyItWorked, playbook.growthEngine].filter(
        (section) => section.trim().split(/\s+/).length >= 18
      ).length *
        0.45
  );

  const actionability = clampScore(
    2 +
      playbook.firstMoves.length * 0.7 +
      averageMoveLength * 0.16 +
      playbook.firstMoves.filter((move) =>
        /\d|experiment|launch|build|use|run|measure|acquire|optimi/i.test(move)
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
