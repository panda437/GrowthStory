import type { Metadata } from "next";
import GrowthPlaybookExperience from "./playbook-experience";

export const metadata: Metadata = {
  title: "Growth Playbook Generator",
  description:
    "Generate a startup growth playbook from public web evidence. Get the primary channel, top tactics, and source-backed takeaways in one place."
};

export default function GrowthPlaybookPage() {
  return <GrowthPlaybookExperience />;
}
