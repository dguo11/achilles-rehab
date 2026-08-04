import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-5 py-10">
      <div className="space-y-1">
        <p className="text-sm font-medium text-teal-700 dark:text-teal-400">Achilla</p>
        <h1 className="text-2xl font-bold tracking-tight">Sign in</h1>
      </div>
      <LoginForm redirectTo={redirect ?? "/onboarding/intake"} />
    </main>
  );
}
