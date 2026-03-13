"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { votePlaybook } from "../../actions/playbook";
import type { PlaybookVotes } from "../../actions/playbook-schema";

export default function VoteControls({
  slug,
  votes
}: {
  slug: string;
  votes: PlaybookVotes;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleVote(direction: "up" | "down") {
    startTransition(async () => {
      await votePlaybook(slug, direction);
      router.refresh();
    });
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap"
      }}
    >
      <button
        type="button"
        disabled={isPending}
        onClick={() => handleVote("up")}
        style={voteButtonStyle}
      >
        Upvote {votes.upvotes}
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => handleVote("down")}
        style={voteButtonStyle}
      >
        Downvote {votes.downvotes}
      </button>
      <span
        style={{
          borderRadius: 999,
          padding: "8px 12px",
          background: "rgba(159, 91, 52, 0.08)",
          fontWeight: 700
        }}
      >
        Score {votes.score}
      </span>
    </div>
  );
}

const voteButtonStyle = {
  borderRadius: 999,
  border: "1px solid rgba(65, 53, 44, 0.14)",
  padding: "8px 12px",
  background: "#fffdf9",
  cursor: "pointer"
} as const;
