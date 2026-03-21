import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlaybookBySlug, getRelatedPlaybooks } from "../../../lib/playbook-runs";
import { refreshGrowthPlaybook } from "../../../actions/playbook";
import { PlaybookCard } from "../playbook-sections";
import VoteControls from "../vote-controls";
import RefreshButton from "./refresh-button";

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
    return { title: "Playbook not found" };
  }

  const title = `${playbook.companyName} Growth Playbook`;
  const description = `${playbook.thePlay} — ${playbook.oneLiner}`;
  const url = `https://growthstory.dev/playbooks/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      type: "article",
      url,
      siteName: "GrowthStory"
    },
    twitter: {
      card: "summary_large_image",
      title,
      description
    }
  };
}

export default async function PlaybookDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const [playbook, related] = await Promise.all([
    getPlaybookBySlug(slug),
    getRelatedPlaybooks(slug)
  ]);

  if (!playbook) {
    notFound();
  }

  return (
    <main style={{ padding: "28px 0 56px" }}>
      <section className="shell">
        <div
          className="stack-mobile"
          style={{
            justifyContent: "space-between",
            gap: 16,
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

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <Link
              href="/playbooks"
              style={{ color: "var(--accent)", fontWeight: 700 }}
            >
              Back to archive
            </Link>
            <RefreshButton slug={slug} refreshAction={refreshGrowthPlaybook} />
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
                justifyContent: "flex-start",
                alignItems: "center",
                gap: 16,
                flexWrap: "wrap"
              }}
            >
              <VoteControls slug={playbook.slug} votes={playbook.votes} />
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
                  background: "#fffdf9",
                  display: "block"
                }}
              >
                {link}
              </a>
            ))}
          </div>
        </div>

        {related.length > 0 && (
          <div className="panel" style={{ padding: 22 }}>
            <p className="eyebrow">Related Playbooks</p>
            <p style={{ margin: "8px 0 18px", color: "var(--muted)", fontSize: 14 }}>
              Startups with similar growth patterns
            </p>
            <div style={{ display: "grid", gap: 12 }}>
              {related.map((item) => (
                <Link
                  key={item.id}
                  href={`/playbooks/${item.slug}`}
                  style={{
                    borderRadius: 16,
                    border: "1px solid rgba(65, 53, 44, 0.12)",
                    background: "#fffdf9",
                    padding: "16px 18px",
                    display: "grid",
                    gap: 6
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                      flexWrap: "wrap"
                    }}
                  >
                    <strong style={{ fontSize: 17 }}>{item.companyName}</strong>
                    <span
                      style={{
                        borderRadius: 999,
                        padding: "4px 10px",
                        background: "rgba(159, 91, 52, 0.08)",
                        color: "var(--accent)",
                        fontSize: 12,
                        fontWeight: 700
                      }}
                    >
                      {item.scorecard.overall}/10
                    </span>
                  </div>
                  <p style={{ margin: 0, color: "var(--muted)", fontSize: 14, lineHeight: 1.6 }}>
                    {item.thePlay}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
