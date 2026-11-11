import Link from "next/link";
import { LegalPage } from "@/components/LegalPage";
import { env } from "@/lib/env";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata(
  "Contact",
  "Contact the operator for Fitness Buddy AI product, account, or privacy questions.",
  "/contact",
);

export default function ContactPage() {
  return (
    <LegalPage
      title="Contact"
      introduction="For account, privacy, or product questions, contact the operator of this deployment."
    >
      <section>
        <h2>Support</h2>
        {env.NEXT_PUBLIC_SUPPORT_EMAIL ? (
          <p>
            Email{" "}
            <a
              className="text-primary underline"
              href={`mailto:${env.NEXT_PUBLIC_SUPPORT_EMAIL}`}
            >
              {env.NEXT_PUBLIC_SUPPORT_EMAIL}
            </a>
            . Please do not send passwords, payment information, or unnecessary
            health details by email.
          </p>
        ) : (
          <p>
            A support address has not been configured for this deployment.
            The operator can set <code>NEXT_PUBLIC_SUPPORT_EMAIL</code> to
            publish a contact link.
          </p>
        )}
      </section>
      <section>
        <h2>Account and privacy requests</h2>
        <p>
          You can{" "}
          <Link href="/settings" className="text-primary underline">
            export or delete your account data in settings
          </Link>
          . For requests involving data held by an authentication or AI
          provider, contact that provider as well.
        </p>
      </section>
      <section>
        <h2>Medical questions</h2>
        <p>
          This service cannot provide medical care. For personal medical
          advice, contact a qualified healthcare professional.
        </p>
      </section>
    </LegalPage>
  );
}
