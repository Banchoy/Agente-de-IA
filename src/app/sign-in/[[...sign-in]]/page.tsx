import { SignIn } from "@clerk/nextjs";

export default function Page() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black p-4">
            <SignIn appearance={{
                elements: {
                    formButtonPrimary: "bg-zinc-900 hover:bg-zinc-800 text-sm",
                    card: "shadow-none border border-zinc-200 dark:border-zinc-800"
                }
            }} />
        </div>
    );
}
