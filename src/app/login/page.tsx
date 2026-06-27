import Link from "next/link";
import { LoginForm } from "./login-form";

export default function LoginPage() {
    return (
        <main className="flex min-h-screen items-center justify-center p-4">
            <div className="w-full max-w-md space-y-6">
                <div className="text-center">
                    <h1 className="text-3xl font-bold">Welcome back</h1>
                    <p className="mt-2 text-gray-600">
                        Log in to your CompliTrack account
                    </p>
                </div>
                <LoginForm />
                <div className="text-center text-sm text-gray-600 space-y-1">
                    <p>
                        <Link href="/reset-password" className="font-medium text-blue-600 hover:underline">
                            Forgot your password?
                        </Link>
                    </p>
                    <p>
                        Don&apos;t have an account?{" "}
                        <Link href="/signup" className="font-medium text-blue-600 hover:underline">
                            Sign up
                        </Link>
                    </p>
                </div>
            </div>
        </main>
    );
}