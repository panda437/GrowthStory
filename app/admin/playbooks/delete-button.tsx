"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteGrowthPlaybook } from "../../../actions/playbook";

export default function DeleteButton({ slug }: { slug: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        const confirmed = window.confirm(
          "Delete this GrowthStory from the archive? The next request for this business will regenerate it from scratch."
        );

        if (!confirmed) {
          return;
        }

        startTransition(async () => {
          await deleteGrowthPlaybook(slug);
          router.refresh();
        });
      }}
      style={{
        borderRadius: 999,
        border: "1px solid rgba(161, 38, 38, 0.18)",
        padding: "8px 12px",
        background: "rgba(161, 38, 38, 0.08)",
        color: "#8f2424",
        cursor: "pointer",
        fontWeight: 600
      }}
    >
      {isPending ? "Deleting..." : "Delete"}
    </button>
  );
}
