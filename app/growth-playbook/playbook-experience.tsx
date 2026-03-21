"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { generateGrowthPlaybook } from "../../actions/playbook";
import type {
  GrowthPlaybook,
  PlaybookScorecard
} from "../../actions/playbook-schema";

type PlaybookResponse = {
  playbook: GrowthPlaybook;
  sourceCount: number;
  savedId: string | null;
  savedSlug: string | null;
  scorecard: PlaybookScorecard;
  fromCache: boolean;
  promptVersion: string;
};

const cardStyle = {
  borderRadius: 20,
  border: "1px solid rgba(65, 53, 44, 0.12)",
  background: "rgba(255, 253, 249, 0.96)",
  padding: 20
} as const;

export default function GrowthPlaybookExperience() {
  const [startupName, setStartupName] = useState("");
  const [result, setResult] = useState<PlaybookResponse | null>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setResult(null);

    startTransition(async () => {
      try {
        const response = await generateGrowthPlaybook(startupName);
        setResult(response);
      } catch (submissionError) {
        setError(
          submissionError instanceof Error
            ? submissionError.message
            : "Something went wrong."
        );
      }
    });
  }

  return (
    <main style={{ padding: "28px 0 56px" }}>
      <section className="shell">
        <div className="panel" style={{ padding: "28px 28px 32px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 16,
              flexWrap: "wrap",
              marginBottom: 26
            }}
          >
            <div>
              <p className="eyebrow">Growth Playbook</p>
              <h1
                style={{
                  margin: "10px 0 0",
                  fontSize: "clamp(2.2rem, 5vw, 4rem)",
                  lineHeight: 0.98,
                  fontFamily: "Georgia, serif",
                  maxWidth: 760
                }}
              >
                Reverse engineer how a startup actually grew.
              </h1>
            </div>

            <Link
              href="/playbooks"
              style={{
                color: "var(--accent)",
                fontWeight: 600
              }}
            >
              Browse archive
            </Link>
          </div>

          <p
            style={{
              margin: 0,
              color: "var(--muted)",
              lineHeight: 1.75,
              fontSize: 16,
              maxWidth: 780
            }}
          >
            Enter a startup name and GrowthStory will search the public web,
            synthesize the strongest evidence, and return a clean growth
            playbook you can use for strategy work, competitive research, or
            founder diligence.
          </p>

          <form
            onSubmit={handleSubmit}
            style={{
              display: "grid",
              gap: 12,
              marginTop: 28
            }}
          >
            <label
              htmlFor="startup-name"
              className="eyebrow"
              style={{ marginBottom: -2 }}
            >
              Startup name
            </label>

            <div className="form-row">
              <input
                id="startup-name"
                value={startupName}
                onChange={(event) => setStartupName(event.target.value)}
                placeholder="Example: Notion"
                required
                style={{
                  width: "100%",
                  borderRadius: 18,
                  border: "1px solid rgba(65, 53, 44, 0.16)",
                  background: "#fffdf9",
                  padding: "16px 18px"
                }}
              />

              <button
                type="submit"
                disabled={isPending}
                style={{
                  borderRadius: 999,
                  border: 0,
                  background: "#1f1f1f",
                  color: "#fff",
                  padding: "0 20px",
                  fontWeight: 600,
                  cursor: isPending ? "wait" : "pointer"
                }}
              >
                {isPending ? "Generating..." : "Generate"}
              </button>
            </div>
          </form>

          {error ? (
            <p style={{ margin: "14px 0 0", color: "#a12626" }}>{error}</p>
          ) : null}
        </div>
      </section>

      {result ? (
        <section className="shell" style={{ marginTop: 22 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr)",
              gap: 16
            }}
          >
            <div style={{ ...cardStyle, gridColumn: "1 / -1" }}>
              <div
                style={{
                  display: "grid",
                  gap: 14
                }}
              >
                <div>
                  <p className="eyebrow">Company</p>
                  <h2
                    style={{
                      margin: "10px 0 8px",
                      fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
                      fontFamily: "Georgia, serif"
                    }}
                  >
                    {result.playbook.companyName}
                  </h2>
                  <p
                    style={{
                      margin: 0,
                      color: "var(--muted)",
                      fontSize: 16,
                      lineHeight: 1.75,
                      maxWidth: 720
                    }}
                  >
                    {result.playbook.oneLiner}
                  </p>
                </div>
              </div>
            </div>

            <div style={cardStyle}>
              <p className="eyebrow">The Play</p>
              <p
                style={{
                  margin: "10px 0 0",
                  fontSize: 24,
                  lineHeight: 1.45,
                  fontWeight: 700
                }}
              >
                {result.playbook.thePlay}
              </p>
            </div>

            <div style={cardStyle}>
              <p className="eyebrow">What to look for</p>
              <p style={{ margin: "10px 0 0", color: "var(--muted)", lineHeight: 1.75 }}>
                Use this playbook as a working hypothesis for channel strategy,
                messaging, and early traction loops. Treat it as evidence-backed
                research, not certainty.
              </p>
            </div>

            <div style={{ ...cardStyle, gridColumn: "1 / -1" }}>
              <p className="eyebrow">Why It Worked</p>
              <p style={{ margin: "14px 0 0", lineHeight: 1.8, color: "var(--muted)" }}>
                {result.playbook.whyItWorked}
              </p>
            </div>

            <div style={{ ...cardStyle, gridColumn: "1 / -1" }}>
              <p className="eyebrow">The First Moves</p>
              <ol style={{ margin: "14px 0 0", paddingLeft: 20, lineHeight: 1.8 }}>
                {result.playbook.firstMoves.map((move, index) => (
                  <li key={index} style={{ marginBottom: 8 }}>
                    {move}
                  </li>
                ))}
              </ol>
            </div>

            <div style={{ ...cardStyle, gridColumn: "1 / -1" }}>
              <p className="eyebrow">The Growth Engine</p>
              <p style={{ margin: "14px 0 0", lineHeight: 1.8, color: "var(--muted)" }}>
                {result.playbook.growthEngine}
              </p>
            </div>

            <div style={{ ...cardStyle, gridColumn: "1 / -1" }}>
              <p className="eyebrow">Evidence links</p>
              <div
                style={{
                  display: "grid",
                  gap: 10,
                  marginTop: 14
                }}
              >
                {result.playbook.evidenceLinks.map((link) => (
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
          </div>
        </section>
      ) : null}
    </main>
  );
}
