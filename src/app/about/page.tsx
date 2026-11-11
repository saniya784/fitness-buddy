import Link from "next/link";
import { LegalPage } from "@/components/LegalPage";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata(
  "About",
  "Learn about Fitness Buddy AI, its planning tools, and how to use educational fitness suggestions responsibly.",
  "/about",
);

export default function AboutPage() {
  return (
    <LegalPage
      title="About Fitness Buddy AI"
      introduction="A planning tool for organizing general fitness and meal ideas around the information you choose to provide."
    >
      <section>
        <h2>What the app does</h2>
        <p>
          Fitness Buddy AI offers a form-based generator and an optional voice
          interface. It stores your submitted measurements in metric units,
          lets you choose metric or imperial display, and tracks whether a
          generated plan is in progress, ready, or unsuccessful.
        </p>
      </section>
      <section>
        <h2>How to use it</h2>
        <p>
          Adults can provide goals, experience, available equipment, and
          relevant limitations to receive a general plan. Review every
          suggestion, adapt it to your own circumstances, and discuss health
          questions with a qualified professional.
        </p>
      </section>
      <section>
        <h2>Explore</h2>
        <p>
          The home page includes clearly labelled fictional{" "}
          <Link href="/#program-gallery" className="text-primary underline">
            sample plans
          </Link>
          . You can also read the{" "}
          <Link href="/help" className="text-primary underline">
            help and FAQ
          </Link>
          .
        </p>
      </section>
    </LegalPage>
  );
}
