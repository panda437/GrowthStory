import Link from "next/link";
import type { ReactNode } from "react";
import type { PlaybookArchiveItem } from "../../actions/playbook-schema";

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
            minWidth: 220,
            borderRadius: 18,
            padding: "14px 16px",
            background: "rgba(159, 91, 52, 0.08)"
          }}
        >
          <p className="eyebrow">Research snapshot</p>
          <p style={{ margin: "10px 0 0", fontWeight: 700 }}>
            Overall {item.scorecard.overall}/10
          </p>
          <p style={{ margin: "8px 0 0", color: "var(--muted)" }}>
            {new Date(item.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric"
            })}
          </p>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.1fr) minmax(240px, 0.9fr)",
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

        <div
          style={{
            borderRadius: 18,
            border: "1px solid rgba(65, 53, 44, 0.12)",
            background: "#fffdf9",
            padding: 18
          }}
        >
          <p className="eyebrow">Evaluation</p>
          <div style={{ marginTop: 12 }}>
            <ScorePills item={item} />
          </div>
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
