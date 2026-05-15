
import { useState, useEffect } from 'react';
import { ModelConfig } from '@/types/models';
import Button from "@/components/Shared/Button";
import Modal from "@/components/Shared/Modal";

interface EditModelModalProps {
    model: ModelConfig;
    isManaged: boolean;
    onClose: () => void;
    onSave: (updates: Partial<ModelConfig> & { apiKey?: string }) => Promise<void>;
}

interface ModelInfo {
    name: string;
    displayName: string;
}

export default function EditModelModal({ model, isManaged, onClose, onSave }: EditModelModalProps) {
    const [editModelId, setEditModelId] = useState(model.id);
    const [editApiKey, setEditApiKey] = useState("");
    const [availableModels, setAvailableModels] = useState<ModelInfo[]>([]);
    const [fetchingModels, setFetchingModels] = useState(false);
    const [saving, setSaving] = useState(false);

    // Initial sync needed if model changes (though typically modal unmounts on close)
    useEffect(() => {
        setEditModelId(model.id);
        setEditApiKey("");
        setAvailableModels([]);
    }, [model]);

    const fetchGoogleModels = async () => {
        if (!editApiKey && !model.hasApiKey) {
            alert("Please enter a Google API Key first to fetch available models.");
            return;
        }

        if (!editApiKey && model.hasApiKey) {
            alert("To list models, please re-enter your Google API Key (security requirement).");
            return;
        }

        setFetchingModels(true);
        try {
            const res = await fetch("/api/google/models", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ apiKey: editApiKey })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Fetch failed");
            }

            const data = await res.json();
            if (data.models) {
                const list = data.models.map((m: { name: string, displayName?: string }) => ({
                    name: m.name.replace(/^models\//, ''),
                    displayName: m.displayName || m.name
                }));
                list.sort((a: ModelInfo, b: ModelInfo) => a.name.localeCompare(b.name));
                setAvailableModels(list);
            }
        } catch (e: unknown) {
            alert(`Fetch failed: ${e instanceof Error ? e.message : "Unknown error"}`);
        } finally {
            setFetchingModels(false);
        }
    };

    const handleSaveClick = async () => {
        setSaving(true);
        try {
            await onSave({
                id: editModelId,
                isEnabled: !model.isArchived,
                isArchived: model.isArchived,
                // If user selected a Google model from dropdown, try to find displayName, else fallback
                name: availableModels.find(m => m.name === editModelId)?.displayName || editModelId,
                apiKey: editApiKey.trim() || undefined
            });
            onClose();
        } catch (error) {
            console.error("Failed to save:", error);
            alert("Failed to save changes.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title={`Configure ${model.name}`}
            size="md"
            actions={
                <>
                    <Button
                        variant="secondary"
                        onClick={onClose}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleSaveClick}
                        disabled={saving}
                        isLoading={saving}
                        loadingText="Saving..."
                    >
                        Save Changes
                    </Button>
                </>
            }
        >
            <div className="space-y-4 max-h-[90vh] overflow-y-auto">
                {/* Google Model Selection */}
                {model.provider === 'google' && (
                    <div className="p-4 rounded-lg" style={{ background: 'var(--blue-2)', border: '1px solid var(--blue-5)' }}>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--blue-12)' }}>Model Selection</label>
                        <div className="flex gap-2 mb-3">
                            <input
                                value={editModelId}
                                onChange={(e) => setEditModelId(e.target.value)}
                                className="flex-1 px-3 py-2 text-sm rounded-md" style={{ border: '1px solid var(--blue-6)', background: 'var(--color-background)', color: 'var(--gray-12)' }}
                                placeholder="e.g. gemini-3.0-flash"
                            />
                            <Button
                                variant="secondary"
                                onClick={fetchGoogleModels}
                                disabled={fetchingModels}
                                isLoading={fetchingModels}
                                loadingText="Listing..."
                                size="xs"
                                className="whitespace-nowrap"
                            >
                                List Available
                            </Button>
                        </div>

                        {availableModels.length > 0 && (
                            <div className="mb-2">
                                <label className="text-xs mb-1 block" style={{ color: 'var(--blue-11)' }}>Found Models:</label>
                                <select
                                    className="w-full text-sm rounded-md p-2" style={{ borderColor: 'var(--blue-6)', background: 'var(--color-background)' }}
                                    onChange={(e) => setEditModelId(e.target.value)}
                                    value={availableModels.find(m => m.name === editModelId) ? editModelId : ""}
                                >
                                    <option value="">-- Select a found model --</option>
                                    {availableModels.map(m => (
                                        <option key={m.name} value={m.name}>{m.displayName} ({m.name})</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <p className="text-xs" style={{ color: 'var(--blue-11)' }}>
                            Use &quot;List Available&quot; to find supported models from your Google account (requires re-entering API Key).
                        </p>
                    </div>
                )}



                {/* API Key Input */}
                {!isManaged && (
                    <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--gray-11)' }}>
                            API Key
                        </label>
                        <input
                            type="password"
                            value={editApiKey}
                            onChange={(e) => setEditApiKey(e.target.value)}
                            placeholder={model.hasApiKey ? "••••••••••••••••" : "sk-..."}
                            className="w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-8)] border-[var(--gray-7)] mb-2"
                        />
                        <div className="flex justify-between items-center">
                            <p className="text-xs text-[var(--gray-10)]">
                                {model.hasApiKey
                                    ? "Leave blank to keep existing key."
                                    : "Enter your API key to enable this model."}
                            </p>
                        </div>
                    </div>
                )}
                {isManaged && (
                    <div className="p-4 rounded-lg" style={{ background: 'var(--gray-2)', border: '1px solid var(--gray-6)' }}>
                        <p className="text-sm" style={{ color: 'var(--gray-11)' }}>
                            <strong>Managed Model:</strong> API keys are managed by the platform. You don&apos;t need to configure anything.
                        </p>
                    </div>
                )}

            </div>
        </Modal>
    );
}
