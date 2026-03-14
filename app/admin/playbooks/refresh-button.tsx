"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { refreshGrowthPlaybook } from "../../../actions/playbook";

export default function RefreshButton({ slug }: { slug: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await refreshGrowthPlaybook(slug);
          router.refresh();
        });
      }}
      style={{
        borderRadius: 999,
        border: "1px solid rgba(65, 53, 44, 0.14)",
        padding: "8px 12px",
        background: "#fffdf9",
        cursor: "pointer",
        fontWeight: 600
      }}
    >
      {isPending ? "Refreshing..." : "Refresh"}
    </button>
  );
}
