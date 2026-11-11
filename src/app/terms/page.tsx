import { LegalPage, LegalReviewNotice } from "@/components/LegalPage";
import { pageMetadata } from "@/lib/metadata";

// TODO: Legal text needs lawyer review before launch.
export const metadata = pageMetadata(
  "Terms of Use",
  "Read the draft terms for using Fitness Buddy AI. The terms require legal review before launch.",
  "/terms",
);

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Use"
      introduction="These draft terms explain the intended use of Fitness Buddy AI. They need review and adaptation before they are used as a binding agreement."
    >
      <section>
        <h2>1. The service</h2>
        <p>
          Fitness Buddy AI provides software tools that use information you
          submit to produce general workout and meal-planning suggestions. The
          service is not a healthcare provider, dietitian, or personal trainer.
        </p>
      </section>
      <section>
        <h2>2. Eligibility and account</h2>
        <p>
          Plan generation is intended for adults aged 18 and over. Keep your
          account credentials secure and use the account settings to export or
          request deletion of the account data stored by this application.
        </p>
      </section>
      <section>
        <h2>3. Health and safety</h2>
        <p>
          AI-generated content may be incomplete, inaccurate, or unsuitable
          for your circumstances. It is not medical advice, diagnosis, or
          treatment. Consult a qualified professional before starting or
          changing exercise or nutrition, and stop if you experience pain or
          feel unwell. Do not use this service for pregnancy-related guidance,
          eating-disorder support, or care for a minor.
        </p>
      </section>
      <section>
        <h2>4. Acceptable use</h2>
        <p>
          Do not misuse the service, interfere with its operation, attempt
          unauthorized access, or submit information you are not entitled to
          provide. You are responsible for deciding whether a suggestion is
          appropriate before acting on it.
        </p>
      </section>
      <section>
        <h2>5. Availability and changes</h2>
        <p>
          Features may change, be interrupted, or be unavailable. These draft
          terms do not promise a particular level of availability or a
          particular fitness outcome.
        </p>
      </section>
      <section>
        <h2>6. Contact and governing terms</h2>
        <p>
          Contact information and the governing law, liability, dispute, and
          consumer-rights provisions must be completed for the operating
          entity and applicable jurisdiction before launch.
        </p>
      </section>
      <LegalReviewNotice />
    </LegalPage>
  );
}
