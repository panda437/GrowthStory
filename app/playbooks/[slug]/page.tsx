import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlaybookBySlug } from "../../../lib/playbook-runs";
import { PlaybookCard, ScorePills } from "../playbook-sections";
import VoteControls from "../vote-controls";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({
  params
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const playbook = await getPlaybookBySlug(slug);

  if (!playbook) {
    return {
      title: "Playbook not found"
    };
  }

  return {
    title: `${playbook.companyName} Growth Playbook`,
    description: playbook.oneLiner
  };
}

export default async function PlaybookDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const playbook = await getPlaybookBySlug(slug);

  if (!playbook) {
    notFound();
  }

  return (
    <main style={{ padding: "28px 0 56px" }}>
      <section className="shell">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            alignItems: "center",
            marginBottom: 18
          }}
        >
          <div>
            <p className="eyebrow">Saved playbook</p>
            <p style={{ margin: "8px 0 0", color: "var(--muted)" }}>
              Archive entry for {playbook.companyName}
            </p>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link
              href="/playbooks"
              style={{
                color: "var(--accent)",
                fontWeight: 700
              }}
            >
              Back to archive
            </Link>
            <Link
              href="/growth-playbook"
              style={{
                borderRadius: 999,
                padding: "10px 16px",
                background: "#1f1f1f",
                color: "#fff",
                fontWeight: 600
              }}
            >
              Generate another
            </Link>
          </div>
        </div>
      </section>

      <section className="shell" style={{ display: "grid", gap: 18 }}>
        <PlaybookCard
          item={playbook}
          footer={
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 16,
                flexWrap: "wrap"
              }}
            >
              <VoteControls slug={playbook.slug} votes={playbook.votes} />
              <ScorePills item={playbook} />
            </div>
          }
        />

        <div className="panel" style={{ padding: 22 }}>
          <p className="eyebrow">Evidence links</p>
          <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
            {playbook.evidenceLinks.map((link) => (
              <a
                key={link}
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  borderRadius: 14,
                  border: "1px solid rgba(65, 53, 44, 0.12)",
                  padding: "12px 14px",
                  color: "var(--accent)",
                  wordBreak: "break-all",
                  background: "#fffdf9"
                }}
              >
                {link}
              </a>
            ))}
          </div>
        </div>

        <div className="panel" style={{ padding: 22 }}>
          <p className="eyebrow">How to judge this playbook</p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 14,
              marginTop: 14
            }}
          >
            <RubricCard
              title="Depth"
              score={playbook.scorecard.depth}
              body="Depth improves when the playbook pulls from multiple sources, cites specific tactics, and captures more than one growth lever."
            />
            <RubricCard
              title="Quality"
              score={playbook.scorecard.quality}
              body="Quality improves when the claims are tightly grounded in source links, the domains are varied, and the strategy aligns with the evidence."
            />
            <RubricCard
              title="Actionability"
              score={playbook.scorecard.actionability}
              body="Actionability improves when tactics are concrete enough to test, contain sequencing or measurement detail, and avoid generic advice."
            />
          </div>
        </div>
      </section>
    </main>
  );
}

function RubricCard({
  title,
  score,
  body
}: {
  title: string;
  score: number;
  body: string;
}) {
  return (
    <div
      style={{
        borderRadius: 18,
        border: "1px solid rgba(65, 53, 44, 0.12)",
        background: "#fffdf9",
        padding: 18
      }}
    >
      <p className="eyebrow">{title}</p>
      <p style={{ margin: "10px 0 0", fontSize: 28, fontWeight: 700 }}>
        {score}/10
      </p>
      <p style={{ margin: "12px 0 0", color: "var(--muted)", lineHeight: 1.75 }}>
        {body}
      </p>
    </div>
  );
}
