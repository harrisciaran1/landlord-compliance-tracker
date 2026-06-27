import Link from "next/link";
import {SignupForm} from "./signup-form";

export default function SignupPage() {
    return (
        <main className="flex min-h-screen items-center justify-center p-4">
            <div className="w-full max-w-md space-y-6">
                <div className="text-center">
                    <h1 className="text-3xl font-bold">Create your account</h1>
                    <p className="mt-2 text-gray-600">
                        Sign up to start tracking your landlord compliance deadlines
                    </p>
                </div>
                <SignupForm />
                <p className="text-center text-sm text-gray-600">
                    Already have an account?{" "}
                    <Link href="/login" className="font-medium text-blue-600 hover:underline">
                        Log in
                    </Link>
                </p>
            </div>
        </main>
    );
}