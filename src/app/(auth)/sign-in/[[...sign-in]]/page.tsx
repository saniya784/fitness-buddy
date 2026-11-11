import { SignIn } from "@clerk/nextjs";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata(
  "Sign In",
  "Sign in to manage your Fitness Buddy AI plans and account.",
  "/sign-in",
  true,
);

const SignInPage = () => {
  return (
    <main className="flex h-screen w-full items-center justify-center">
      <SignIn />
    </main>
  );
};
export default SignInPage;
