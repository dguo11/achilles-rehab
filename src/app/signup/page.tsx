import { SignupForm } from "@/components/auth/signup-form";
import { DisclaimerBanner } from "@/components/disclaimer-banner";

export default function SignupPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-5 py-10">
      <div className="space-y-1">
        <p className="text-sm font-medium text-teal-700 dark:text-teal-400">Achilla</p>
        <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
      </div>
      <SignupForm />
      <DisclaimerBanner />
    </main>
  );
}
