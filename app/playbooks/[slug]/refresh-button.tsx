"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { GenerateGrowthPlaybookResult } from "../../../actions/playbook-schema";

type RefreshAction = (slug: string) => Promise<GenerateGrowthPlaybookResult>;

export default function RefreshButton({
    slug,
    refreshAction
}: {
    slug: string;
    refreshAction: RefreshAction;
}) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    function handleRefresh() {
        startTransition(async () => {
            try {
                await refreshAction(slug);
                router.refresh();
            } catch {
                // Silently fail — the page still shows the stale version
            }
        });
    }

    return (
        <button
            onClick={handleRefresh}
            disabled={isPending}
            style={{
                borderRadius: 999,
                border: "1px solid rgba(65, 53, 44, 0.16)",
                background: isPending ? "rgba(159, 91, 52, 0.06)" : "#fffdf9",
                color: isPending ? "var(--muted)" : "var(--accent)",
                padding: "10px 16px",
                fontWeight: 600,
                cursor: isPending ? "wait" : "pointer",
                fontSize: 14
            }}
        >
            {isPending ? "Regenerating…" : "↺ Regenerate"}
        </button>
    );
}
