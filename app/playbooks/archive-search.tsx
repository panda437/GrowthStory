"use client";

import Link from "next/link";
import { useState } from "react";
import type { PlaybookArchiveItem } from "../../actions/playbook-schema";
import { PlaybookCard } from "./playbook-sections";
import VoteControls from "./vote-controls";

function matchesQuery(item: PlaybookArchiveItem, query: string) {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
        item.companyName.toLowerCase().includes(q) ||
        item.startupName.toLowerCase().includes(q) ||
        item.thePlay.toLowerCase().includes(q) ||
        item.oneLiner.toLowerCase().includes(q)
    );
}

export default function ArchiveSearch({
    playbooks
}: {
    playbooks: PlaybookArchiveItem[];
}) {
    const [query, setQuery] = useState("");
    const filtered = playbooks.filter((item) => matchesQuery(item, query));

    return (
        <div style={{ display: "grid", gap: 18 }}>
            {/* Search bar */}
            <div className="panel" style={{ padding: "16px 20px" }}>
                <div style={{ position: "relative" }}>
                    <svg
                        style={{
                            position: "absolute",
                            left: 14,
                            top: "50%",
                            transform: "translateY(-50%)",
                            opacity: 0.4,
                            pointerEvents: "none"
                        }}
                        width={16}
                        height={16}
                        viewBox="0 0 16 16"
                        fill="none"
                    >
                        <circle cx="6.5" cy="6.5" r="5" stroke="#1f1f1f" strokeWidth="1.5" />
                        <path d="M10.5 10.5L14 14" stroke="#1f1f1f" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    <input
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search by company name, growth play…"
                        style={{
                            width: "100%",
                            borderRadius: 14,
                            border: "1px solid rgba(65, 53, 44, 0.16)",
                            background: "#fffdf9",
                            padding: "13px 16px 13px 40px",
                            fontSize: 15
                        }}
                    />
                </div>
                {query && (
                    <p
                        style={{
                            margin: "10px 0 0",
                            color: "var(--muted)",
                            fontSize: 13
                        }}
                    >
                        {filtered.length === 0
                            ? "No playbooks match that search."
                            : `${filtered.length} of ${playbooks.length} playbooks`}
                    </p>
                )}
            </div>

            {/* Results */}
            {filtered.length === 0 && query ? (
                <div className="panel" style={{ padding: 24 }}>
                    <p className="eyebrow">No results</p>
                    <p style={{ margin: "10px 0 0", color: "var(--muted)" }}>
                        Try a different company name or keyword.
                    </p>
                </div>
            ) : (
                filtered.map((item) => (
                    <PlaybookCard
                        key={item.id}
                        item={item}
                        footer={
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    gap: 16,
                                    alignItems: "center",
                                    flexWrap: "wrap"
                                }}
                            >
                                <VoteControls slug={item.slug} votes={item.votes} />
                                <Link
                                    href={`/playbooks/${item.slug}`}
                                    style={{ color: "var(--accent)", fontWeight: 700 }}
                                >
                                    Read full playbook
                                </Link>
                            </div>
                        }
                    />
                ))
            )}
        </div>
    );
}
