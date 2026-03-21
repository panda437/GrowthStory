import Link from "next/link";
import type { ReactNode } from "react";
import type { PlaybookArchiveItem } from "../../actions/playbook-schema";

function getDaysAgo(dateStr: string) {
  const ms = Date.now() - new Date(dateStr).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function ScorePills({
  item
}: {
  item: Pick<PlaybookArchiveItem, "scorecard" | "sourceCount">;
}) {
  const pills = [
    `Depth ${item.scorecard.depth}/10`,
    `Quality ${item.scorecard.quality}/10`,
    `Actionability ${item.scorecard.actionability}/10`,
    `${item.sourceCount} sources`
  ];

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {pills.map((pill) => (
        <span
          key={pill}
          style={{
            borderRadius: 999,
            padding: "7px 10px",
            background: "rgba(159, 91, 52, 0.08)",
            color: "#7f4d2f",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.04em"
          }}
        >
          {pill}
        </span>
      ))}
    </div>
  );
}

export function PlaybookCard({
  item,
  footer
}: {
  item: PlaybookArchiveItem;
  footer?: ReactNode;
}) {
  return (
    <article
      className="panel"
      style={{
        padding: 22,
        display: "grid",
        gap: 16
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          alignItems: "flex-start",
          flexWrap: "wrap"
        }}
      >
        <div style={{ maxWidth: 760 }}>
          <p className="eyebrow">Company</p>
          <h2
            style={{
              margin: "10px 0 8px",
              fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
              fontFamily: "Georgia, serif"
            }}
          >
            <Link href={`/playbooks/${item.slug}`}>{item.companyName}</Link>
          </h2>
          <p
            style={{
              margin: 0,
              color: "var(--muted)",
              lineHeight: 1.75,
              fontSize: 16
            }}
          >
            {item.oneLiner}
          </p>
        </div>

        <div
          style={{
            borderRadius: 18,
            padding: "14px 16px",
            background: "rgba(159, 91, 52, 0.08)",
            flexShrink: 0
          }}
        >
          <p className="eyebrow">Generated</p>
          <p style={{ margin: "10px 0 4px", fontWeight: 700 }}>
            {new Date(item.updatedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric"
            })}
          </p>
          <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>
            {getDaysAgo(item.updatedAt)} days ago
          </p>
          {getDaysAgo(item.updatedAt) > 60 && (
            <span
              style={{
                display: "inline-block",
                marginTop: 8,
                borderRadius: 999,
                padding: "4px 9px",
                background: "rgba(200, 140, 40, 0.14)",
                color: "#8a6000",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.04em"
              }}
            >
              May be outdated
            </span>
          )}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr)",
          gap: 16
        }}
      >
        <div
          style={{
            borderRadius: 18,
            border: "1px solid rgba(65, 53, 44, 0.12)",
            background: "#fffdf9",
            padding: 18
          }}
        >
          <p className="eyebrow">The Play</p>
          <p
            style={{
              margin: "10px 0 0",
              fontSize: 22,
              lineHeight: 1.5,
              fontWeight: 700
            }}
          >
            {item.thePlay}
          </p>
        </div>
      </div>

      <div
        style={{
          borderRadius: 18,
          border: "1px solid rgba(65, 53, 44, 0.12)",
          background: "#fffdf9",
          padding: 18
        }}
      >
        <p className="eyebrow">Why It Worked</p>
        <p style={{ margin: "12px 0 0", lineHeight: 1.8, color: "var(--muted)" }}>
          {item.whyItWorked}
        </p>
      </div>

      <div
        style={{
          borderRadius: 18,
          border: "1px solid rgba(65, 53, 44, 0.12)",
          background: "#fffdf9",
          padding: 18
        }}
      >
        <p className="eyebrow">The First Moves</p>
        <ol style={{ margin: "14px 0 0", paddingLeft: 22, lineHeight: 1.85 }}>
          {item.firstMoves.map((move, index) => (
            <li key={`${item.id}-${index}`} style={{ marginBottom: 8 }}>
              {move}
            </li>
          ))}
        </ol>
      </div>

      <div
        style={{
          borderRadius: 18,
          border: "1px solid rgba(65, 53, 44, 0.12)",
          background: "#fffdf9",
          padding: 18
        }}
      >
        <p className="eyebrow">The Growth Engine</p>
        <p style={{ margin: "12px 0 0", lineHeight: 1.8, color: "var(--muted)" }}>
          {item.growthEngine}
        </p>
      </div>

      {footer}
    </article>
  );
}
