import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { LeadRepository } from "@/lib/repositories/lead";
import { OrganizationRepository } from "@/lib/repositories/organization";

// GET /api/leads/[id] - Buscar lead
export async function GET(req: Request, { params }: { params: { id: string } }) {
    try {
        const { orgId: clerkOrgId } = await auth();
        if (!clerkOrgId) return new NextResponse("Unauthorized", { status: 401 });

        const lead = await LeadRepository.getById(params.id);
        if (!lead) return new NextResponse("Lead not found", { status: 404 });

        return NextResponse.json(lead);
    } catch (error: any) {
        return new NextResponse(error.message, { status: 500 });
    }
}

// PATCH /api/leads/[id] - Atualizar lead (estágio, cor, metadados)
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
    try {
        const { orgId: clerkOrgId } = await auth();
        if (!clerkOrgId) return new NextResponse("Unauthorized", { status: 401 });

        const body = await req.json();
        const { stageId, metaData, cardColor, phone, email, source, name } = body;

        const updateData: any = {};
        if (stageId) updateData.stageId = stageId;
        if (phone) updateData.phone = phone;
        if (email) updateData.email = email;
        if (source) updateData.source = source;
        if (name) updateData.name = name;
        
        if (metaData || cardColor) {
            const currentLead = await LeadRepository.getById(params.id);
            if (!currentLead) return new NextResponse("Lead not found", { status: 404 });
            
            const currentMeta = (currentLead.metaData as any) || {};
            updateData.metaData = { 
                ...currentMeta, 
                ...(metaData || {}),
                ...(cardColor !== undefined ? { cardColor } : {})
            };
        }

        await LeadRepository.update(params.id, updateData);
        
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("❌ [API Lead PATCH] Erro:", error);
        return new NextResponse(error.message, { status: 500 });
    }
}

// DELETE /api/leads/[id] - Excluir lead
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    try {
        const { orgId: clerkOrgId } = await auth();
        if (!clerkOrgId) return new NextResponse("Unauthorized", { status: 401 });

        await LeadRepository.delete(params.id);
        
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return new NextResponse(error.message, { status: 500 });
    }
}
