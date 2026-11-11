import Link from "next/link";
import { LegalPage } from "@/components/LegalPage";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata(
  "Help and FAQ",
  "Answers about plan generation, privacy, units, safety, workout history, and account controls.",
  "/help",
);

const faqs = [
  {
    question: "Who can generate a plan?",
    answer:
      "Plan generation is intended for adults aged 18 and older. The app does not create plans for minors.",
  },
  {
    question: "Is a generated plan medical advice?",
    answer:
      "No. Plans are general educational suggestions and are not medical advice, diagnosis, or treatment. Consult a qualified healthcare professional before changing exercise or nutrition.",
  },
  {
    question: "What if I mention pregnancy or an eating-disorder concern?",
    answer:
      "The generator will not create a plan for those situations. Please seek individualized help from a qualified healthcare professional or relevant specialist.",
  },
  {
    question: "Why is my plan still generating?",
    answer:
      "Plan generation runs in the background. The page and your profile update when the plan is ready. If generation fails, you can retry; retries are subject to the plan-generation rate limit.",
  },
  {
    question: "Can I use metric or imperial units?",
    answer:
      "Yes. Choose your display preference in account settings. Height and weight are converted to centimeters and kilograms for storage and generation.",
  },
  {
    question: "How do I export or delete my data?",
    answer:
      "Open account settings to download a JSON export or request deletion of your application data and Clerk account.",
  },
  {
    question: "Why can't I start a voice call?",
    answer:
      "Voice calling requires the deployment's Vapi configuration and microphone permission. You can use the form generator if voice is unavailable.",
  },
];

export default function HelpPage() {
  return (
    <LegalPage
      title="Help and FAQ"
      introduction="Answers about creating plans, safety, account controls, and the optional voice generator."
    >
      {faqs.map((faq) => (
        <section key={faq.question}>
          <h2>{faq.question}</h2>
          <p>{faq.answer}</p>
        </section>
      ))}
      <p>
        Need help with your account? Visit{" "}
        <Link href="/settings" className="text-primary underline">
          account settings
        </Link>{" "}
        or the <Link href="/contact" className="text-primary underline">contact page</Link>.
      </p>
    </LegalPage>
  );
}
