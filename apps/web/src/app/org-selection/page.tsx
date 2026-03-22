import { OrganizationList } from "@clerk/nextjs";

export default function OrgSelectionPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 p-6 font-sans">
            <div className="w-full max-w-md space-y-8 text-center">
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Selecione sua Organização</h1>
                    <p className="text-zinc-600">Escolha um espaço de trabalho para continuar ou crie um novo.</p>
                </div>
                <div className="flex justify-center">
                    <OrganizationList
                        hidePersonal={true}
                        afterSelectOrganizationUrl="/dashboard"
                        afterCreateOrganizationUrl="/dashboard"
                        appearance={{
                            elements: {
                                rootBox: "w-full",
                                card: "shadow-none border border-zinc-200 bg-white",
                                organizationSwitcherTrigger: "hover:bg-zinc-50",
                                organizationListPreviewItem: "hover:bg-zinc-50 transition-colors"
                            }
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
