export default function OfflinePage() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
            <h1 className="text-3xl font-bold">You are offline</h1>
            <p className="mt-4 text-gray-600">
                Please check your internet connection and try again.
            </p>
        </main>
    );
}