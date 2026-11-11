import { SignUp } from "@clerk/nextjs";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata(
  "Create Account",
  "Create an account to build and manage your Fitness Buddy AI plans.",
  "/sign-up",
  true,
);

const SignUpPage = () => {
  return (
    <main className="flex h-screen w-full items-center justify-center">
      <SignUp />
    </main>
  );
};
export default SignUpPage;
