import { UpdatePasswordForm } from "./update-password-form";

export default function UpdatePasswordPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
            <h1 className="text-3xl font-bold">Set New Password</h1>
            <p className="mt-2 text-gray-600"> Enter your new password below</p>
        </div>
        <UpdatePasswordForm />
      </div>
    </main>
  );
}