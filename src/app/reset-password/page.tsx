import Link from "next/link";
import { ResetPasswordForm } from "./reset-password-form";

export default function ResetPasswordPage() {
    return (
        <main className="flex min-h-screen items-center justify-center p-4">
            <div className="w-full max-w-md space-y-6">
                <div className="text-center">
                    <h1 className="text-3xl font-bold">Reset your password</h1>
                    <p className="mt-2 text-gray-600">
                        Enter your email address below and we&apos;ll send you a link.
                    </p>
                </div>
                <ResetPasswordForm />
                <p className="text-center text-sm text-gray-600">
                    <Link href="/login" className="font-medium text-blue-600 hover:underline">
                        Back to login
                    </Link>
                </p>
            </div>
        </main>
    );
}
                