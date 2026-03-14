import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlaybookBySlug } from "../../../lib/playbook-runs";
import { PlaybookCard } from "../playbook-sections";
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
                  background: "#fffdf9"
                }}
              >
                {link}
              </a>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
