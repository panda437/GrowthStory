import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "AI Growth Research for Startup Teams",
  description:
    "Research how startups grew, uncover their acquisition channels, and turn public evidence into practical growth playbooks."
};

const featureCardStyle = {
  background: "rgba(255, 253, 249, 0.92)",
  border: "1px solid rgba(65, 53, 44, 0.12)",
  borderRadius: 20,
  padding: 20
} as const;

export default function HomePage() {
  return (
    <main style={{ padding: "28px 0 56px" }}>
      <section className="shell">
        <div
          className="panel"
          style={{
            padding: "28px 28px 32px",
            overflow: "hidden",
            position: "relative"
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: "auto -80px -120px auto",
              width: 280,
              height: 280,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(159, 91, 52, 0.16), rgba(159, 91, 52, 0))"
            }}
          />

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 16,
              flexWrap: "wrap",
              marginBottom: 36
            }}
          >
            <div>
              <p className="eyebrow">GrowthStory</p>
              <p style={{ margin: "8px 0 0", color: "var(--muted)", maxWidth: 520 }}>
                AI-native research workflows for teams that want sharper growth
                thinking than generic teardown threads.
              </p>
            </div>

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
              Open Growth Playbook
            </Link>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.5fr) minmax(280px, 0.9fr)",
              gap: 24,
              alignItems: "end"
            }}
          >
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: "clamp(2.6rem, 6vw, 5.4rem)",
                  lineHeight: 0.95,
                  fontFamily: "Georgia, serif",
                  maxWidth: 760
                }}
              >
                Turn startup noise into an evidence-backed growth narrative.
              </h1>

              <p
                style={{
                  margin: "20px 0 0",
                  fontSize: 18,
                  lineHeight: 1.65,
                  color: "var(--muted)",
                  maxWidth: 720
                }}
              >
                GrowthStory reads public write-ups, interviews, and community
                posts, then distills what actually drove growth into something a
                founder, operator, or marketer can act on.
              </p>

              <div
                style={{
                  display: "flex",
                  gap: 12,
                  flexWrap: "wrap",
                  marginTop: 24
                }}
              >
                <Link
                  href="/growth-playbook"
                  style={{
                    borderRadius: 999,
                    padding: "14px 20px",
                    background: "var(--accent)",
                    color: "#fff",
                    fontWeight: 600
                  }}
                >
                  Generate a playbook
                </Link>
                <a
                  href="#how-it-works"
                  style={{
                    borderRadius: 999,
                    padding: "14px 20px",
                    border: "1px solid rgba(65, 53, 44, 0.16)",
                    color: "#1f1f1f",
                    fontWeight: 600
                  }}
                >
                  See how it works
                </a>
                <Link
                  href="/playbooks"
                  style={{
                    borderRadius: 999,
                    padding: "14px 20px",
                    border: "1px solid rgba(65, 53, 44, 0.16)",
                    color: "#1f1f1f",
                    fontWeight: 600
                  }}
                >
                  Browse archive
                </Link>
              </div>
            </div>

            <div
              style={{
                ...featureCardStyle,
                background:
                  "linear-gradient(180deg, rgba(255,253,249,0.96) 0%, rgba(246,236,225,0.92) 100%)"
              }}
            >
              <p className="eyebrow">Best for</p>
              <ul
                style={{
                  margin: "14px 0 0",
                  paddingLeft: 18,
                  color: "var(--muted)",
                  lineHeight: 1.8
                }}
              >
                <li>Founder-led growth research</li>
                <li>Competitive growth intelligence</li>
                <li>Investor and operator diligence</li>
                <li>Quick strategic teardowns before execution</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        className="shell"
        style={{ marginTop: 28, display: "grid", gap: 18 }}
      >
        <div style={{ maxWidth: 760 }}>
          <p className="eyebrow">How It Works</p>
          <h2
            style={{
              margin: "10px 0 0",
              fontSize: "clamp(2rem, 4vw, 3rem)",
              fontFamily: "Georgia, serif"
            }}
          >
            A focused research flow, not a generic chatbot.
          </h2>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 16
          }}
        >
          <div style={featureCardStyle}>
            <p className="eyebrow">01</p>
            <h3 style={{ margin: "10px 0 8px", fontSize: 20 }}>
              Search the right evidence
            </h3>
            <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.7 }}>
              We use Exa to pull public coverage, long-form analysis, and
              community context around how a startup grew.
            </p>
          </div>

          <div style={featureCardStyle}>
            <p className="eyebrow">02</p>
            <h3 style={{ margin: "10px 0 8px", fontSize: 20 }}>
              Synthesize the signal
            </h3>
            <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.7 }}>
              The model extracts primary channels, tactics, and supporting
              evidence instead of dumping loose summaries.
            </p>
          </div>

          <div style={featureCardStyle}>
            <p className="eyebrow">03</p>
            <h3 style={{ margin: "10px 0 8px", fontSize: 20 }}>
              Keep a research trail
            </h3>
            <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.7 }}>
              Each generated playbook is stored in MongoDB so you can build a
              reusable archive of startup growth intelligence.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
