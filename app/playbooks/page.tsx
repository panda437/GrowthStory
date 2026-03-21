import type { Metadata } from "next";
import Link from "next/link";
import { getPlaybookArchive } from "../../lib/playbook-runs";
import ArchiveSearch from "./archive-search";

export const metadata: Metadata = {
  title: "Growth Playbook Archive",
  description:
    "Browse saved startup growth playbooks, ranked by popularity and backed by public evidence."
};

export const dynamic = "force-dynamic";

export default async function PlaybooksArchivePage() {
  const playbooks = await getPlaybookArchive();

  return (
    <main style={{ padding: "28px 0 56px" }}>
      <section className="shell">
        <div className="panel" style={{ padding: "28px 28px 32px" }}>
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
              <p className="eyebrow">Archive</p>
              <h1
                style={{
                  margin: "10px 0 0",
                  fontSize: "clamp(2.4rem, 5vw, 4.4rem)",
                  lineHeight: 0.98,
                  fontFamily: "Georgia, serif"
                }}
              >
                Browse every saved growth playbook.
              </h1>
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link
                href="/growth-playbook"
                style={{
                  borderRadius: 999,
                  padding: "12px 18px",
                  background: "#1f1f1f",
                  color: "#fff",
                  fontWeight: 600
                }}
              >
                Generate new playbook
              </Link>
              <Link
                href="/"
                style={{
                  borderRadius: 999,
                  padding: "12px 18px",
                  border: "1px solid rgba(65, 53, 44, 0.14)",
                  fontWeight: 600
                }}
              >
                Home
              </Link>
            </div>
          </div>

          <p
            style={{
              margin: "0",
              color: "var(--muted)",
              lineHeight: 1.8,
              fontSize: 16,
              maxWidth: 840
            }}
          >
            Archive entries are sorted by popularity first, then by overall
            evaluation score and recency. Use the scores to judge whether a
            playbook is deep enough, evidence-backed enough, and actionable
            enough to trust.
          </p>
        </div>
      </section>

      <section className="shell" style={{ marginTop: 22 }}>
        {playbooks.length === 0 ? (
          <div className="panel" style={{ padding: 24 }}>
            <p className="eyebrow">No playbooks yet</p>
            <p style={{ margin: "12px 0 0", color: "var(--muted)" }}>
              Generate your first startup teardown from the Growth Playbook page.
            </p>
          </div>
        ) : (
          <ArchiveSearch playbooks={playbooks} />
        )}
      </section>
    </main>
  );
}
