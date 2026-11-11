import { LegalPage, LegalReviewNotice } from "@/components/LegalPage";
import { pageMetadata } from "@/lib/metadata";

// TODO: Legal text needs lawyer review before launch.
export const metadata = pageMetadata(
  "Privacy Notice",
  "Review how Fitness Buddy AI handles account information, plan data, providers, exports, and deletion.",
  "/privacy",
);

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Notice"
      introduction="This draft describes the data categories used by the current application. Confirm the actual deployment, provider settings, retention periods, and jurisdictional requirements before launch."
    >
      <section>
        <h2>Information stored</h2>
        <ul>
          <li>
            Account details supplied by your sign-in provider, such as a user
            identifier, name, email address, and profile image.
          </li>
          <li>
            Fitness-plan inputs such as age, height, weight, goal, experience,
            equipment, injuries or limitations, and dietary restrictions.
          </li>
          <li>
            Generated plans, unit preference, plan status, and the timestamp
            when you accepted the health disclaimer.
          </li>
          <li>
            Operational records needed to provide features such as rate
            limiting and plan history.
          </li>
        </ul>
      </section>
      <section>
        <h2>How information is used</h2>
        <p>
          The application uses account information to authenticate you and
          associate your plans with your account. Generation inputs are sent
          to the configured AI provider to prepare a plan. Voice generation
          also uses the configured voice provider. Do not enter information
          you do not want processed by those providers.
        </p>
      </section>
      <section>
        <h2>Service providers</h2>
        <p>
          The current implementation integrates Clerk for authentication,
          Convex for application data, Google Gemini for AI-generated plans,
          and Vapi for optional voice interactions. Each provider handles data
          under its own terms and settings; review those terms and configure
          provider retention and region settings before production.
        </p>
      </section>
      <section>
        <h2>Your choices</h2>
        <p>
          Account settings provide a JSON export and a control to request
          deletion of the account and application data. Contact the service
          operator for questions or requests that those controls do not cover.
          Deletion from this application does not by itself remove information
          already retained by third-party providers under their own policies.
        </p>
      </section>
      <section>
        <h2>Security and retention</h2>
        <p>
          Application data is stored in the configured Convex deployment.
          Retention, backups, access controls, international transfers, and
          incident procedures depend on the deployment and provider
          configuration. Those details and a retention schedule must be
          confirmed by the operator.
        </p>
      </section>
      <section>
        <h2>Contact</h2>
        <p>
          Use the contact page to find the support address configured for this
          deployment.
        </p>
      </section>
      <LegalReviewNotice />
    </LegalPage>
  );
}
