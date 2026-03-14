import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPlaybookArchive } from "../../../lib/playbook-runs";
import DeleteButton from "./delete-button";
import RefreshButton from "./refresh-button";

export const metadata: Metadata = {
  title: "Admin Playbooks",
  description: "Internal admin view for refreshing GrowthStory playbooks."
};

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    key?: string;
  }>;
};

export default async function AdminPlaybooksPage({ searchParams }: PageProps) {
  const { key } = await searchParams;

  if (!key || key !== process.env.ADMIN_SECRET) {
    notFound();
  }

  const playbooks = await getPlaybookArchive();

  return (
    <main style={{ padding: "28px 0 56px" }}>
      <section className="shell">
        <div className="panel" style={{ padding: "28px 28px 32px" }}>
          <p className="eyebrow">Admin</p>
          <h1
            style={{
              margin: "10px 0 0",
              fontSize: "clamp(2.2rem, 5vw, 4rem)",
              lineHeight: 0.98,
              fontFamily: "Georgia, serif"
            }}
          >
            Refresh or inspect every business in the archive.
          </h1>
          <p style={{ margin: "16px 0 0", color: "var(--muted)", lineHeight: 1.8 }}>
            This view is intentionally hidden behind your admin secret. Use it to
            check which prompt version produced a playbook and refresh entries
            that need a stronger result. Delete removes the cached story entirely
            so the next generation starts fresh.
          </p>
        </div>
      </section>

      <section className="shell" style={{ marginTop: 22, display: "grid", gap: 14 }}>
        {playbooks.map((playbook) => (
          <article
            key={playbook.id}
            className="panel"
            style={{
              padding: 20,
              display: "grid",
              gap: 14
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 16,
                flexWrap: "wrap"
              }}
            >
              <div style={{ maxWidth: 780 }}>
                <p className="eyebrow">Company</p>
                <h2
                  style={{
                    margin: "10px 0 8px",
                    fontSize: 28,
                    fontFamily: "Georgia, serif"
                  }}
                >
                  {playbook.companyName}
                </h2>
                <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.75 }}>
                  {playbook.oneLiner}
                </p>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <RefreshButton slug={playbook.slug} />
                <DeleteButton slug={playbook.slug} />
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 12
              }}
            >
              <AdminStat label="Slug" value={playbook.slug} />
              <AdminStat label="Prompt" value={playbook.promptVersion} />
              <AdminStat label="Updated" value={new Date(playbook.updatedAt).toLocaleString()} />
              <AdminStat label="Votes" value={`${playbook.votes.upvotes} / ${playbook.votes.downvotes}`} />
              <AdminStat label="Overall" value={`${playbook.scorecard.overall}/10`} />
              <AdminStat label="Sources" value={`${playbook.sourceCount}`} />
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

function AdminStat({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        borderRadius: 14,
        border: "1px solid rgba(65, 53, 44, 0.12)",
        background: "#fffdf9",
        padding: "12px 14px"
      }}
    >
      <p className="eyebrow">{label}</p>
      <p style={{ margin: "8px 0 0", fontWeight: 600, wordBreak: "break-word" }}>
        {value}
      </p>
    </div>
  );
}
