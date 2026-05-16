"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import EntityForm from "@/components/EntityForm";

interface Entity {
    id: string;
    name: string;
}

export default function EditEntityPage() {
    const params = useParams();
    const router = useRouter();
    const entityId = params.id as string;
    const [entity, setEntity] = useState<Entity | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (entityId) {
            fetchEntity();
        }
    }, [entityId]);

    const fetchEntity = async () => {
        try {
            const res = await fetch(`/api/entities/${entityId}`);
            if (!res.ok) {
                throw new Error("Failed to fetch entity");
            }
            const data = await res.json();
            setEntity(data);
        } catch (error) {
            console.error("Error fetching entity:", error);
            router.push("/entities");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-gray-500">Loading...</div>
            </div>
        );
    }

    if (!entity) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12">
            <div className="max-w-2xl mx-auto px-4">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Edit Entity</h1>
                    <p className="text-gray-600 mt-2">Update the details of your entity</p>
                </div>
                <EntityForm initialData={entity} isEditing={true} />
            </div>
        </div>
    );
}
