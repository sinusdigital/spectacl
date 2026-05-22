
import { useState } from 'react';
import { DEFAULT_MODELS } from '@/types/models';
import Button from "@/components/Shared/Button";
import Modal from "@/components/Shared/Modal";

interface AddModelModalProps {
    onClose: () => void;
    onSave: (data: { provider: string, modelId: string, apiKey: string, name: string }) => Promise<void>;
}

interface GoogleModel {
    name: string;
    displayName: string;
}

export default function AddModelModal({ onClose, onSave }: AddModelModalProps) {
    const [addStep, setAddStep] = useState(1); // 1 = Provider, 2 = Config
    const [addProvider, setAddProvider] = useState("");
    const [addModelId, setAddModelId] = useState("");
    const [addApiKey, setAddApiKey] = useState("");
    const [verifying, setVerifying] = useState(false);
    const [availableAddModels, setAvailableAddModels] = useState<GoogleModel[]>([]);

    const handleProviderSelect = (provider: string) => {
        setAddProvider(provider);
        setAddStep(2);
        // Reset defaults
        setAddModelId("");
        setAddApiKey("");
        setAvailableAddModels([]);
    };

    const handleBack = () => {
        setAddStep(1);
    };

    const handleSave = async () => {
        if (!addProvider || !addModelId || !addApiKey) {
            alert("Please fill in all fields.");
            return;
        }

        setVerifying(true);
        try {
            // 1. Test Connection
            const testRes = await fetch("/api/models/test-connection", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    provider: addProvider,
                    apiKey: addApiKey,
                    modelId: addModelId
                })
            });
            const testData = await testRes.json();

            if (!testRes.ok || !testData.success) {
                alert(`Connection Failed: ${testData.error || "Unknown error"}`);
                setVerifying(false);
                return;
            }

            // 2. Prepare Name
            let name = addModelId;
            const supported = DEFAULT_MODELS.find(m => m.id === addModelId);
            if (supported) name = supported.name;
            const googleModel = availableAddModels.find(m => m.name === addModelId);
            if (googleModel) name = googleModel.displayName;

            // 3. Save
            await onSave({
                provider: addProvider,
                modelId: addModelId,
                apiKey: addApiKey,
                name: name
            });
            onClose();

        } catch (error: unknown) {
            alert(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
        } finally {
            setVerifying(false);
        }
    };

    const fetchGoogleModels = async () => {
        if (!addApiKey) {
            alert("Please enter API Key first");
            return;
        }
        try {
            const res = await fetch("/api/google/models", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ apiKey: addApiKey })
            });
            if (!res.ok) throw new Error("Fetch failed");
            const data = await res.json();
            if (data.models) {
                const list = data.models.map((m: { name: string, displayName?: string }) => ({
                    name: m.name.replace(/^models\//, ''),
                    displayName: m.displayName || m.name
                }));
                list.sort((a: GoogleModel, b: GoogleModel) => a.name.localeCompare(b.name));
                setAvailableAddModels(list);
            }
        } catch (e: unknown) {
            alert(e instanceof Error ? e.message : "Fetch failed");
        }
    };

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title={addStep === 1 ? "Add New Model" : undefined}
            size="md"
            actions={addStep === 2 && (
                <>
                    <Button
                        variant="secondary"
                        onClick={onClose}
                        type="button"
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleSave}
                        disabled={verifying}
                        isLoading={verifying}
                        loadingText="Verify & Save"
                        type="submit"
                    >
                        Verify & Save
                    </Button>
                </>
            )}
        >
            <div className="p-0">
                {addStep === 2 && ( // If step 2, render custom header because we need a back button
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2">
                            {addStep === 2 && (
                                <button onClick={handleBack} className="text-[var(--gray-9)] hover:text-[var(--gray-11)] mr-2">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                    </svg>
                                </button>
                            )}
                            <h2 className="text-xl font-bold text-[var(--gray-12)]">Add New Model</h2>
                        </div>
                        <button onClick={onClose} className="text-[var(--gray-9)] hover:text-[var(--gray-11)]">✕</button>
                    </div>
                )}

                {addStep === 1 ? (
                    <div className="grid grid-cols-1 gap-3 px-6 pb-6 pt-0">
                        <button
                            onClick={() => handleProviderSelect('openai')}
                            className="flex items-center gap-4 p-4 border border-[var(--gray-6)] rounded-xl hover:border-[var(--grass-8)] hover:bg-[var(--grass-2)] transition-all group text-left"
                        >
                            <div className="w-10 h-10 rounded-lg bg-[var(--grass-3)] flex items-center justify-center text-[var(--grass-9)]">
                                <span className="font-bold">O</span>
                            </div>
                            <div>
                                <h3 className="font-semibold text-[var(--gray-12)] group-hover:text-[var(--grass-11)]">OpenAI</h3>
                                <p className="text-sm text-[var(--gray-10)]">GPT-4, GPT-3.5 Turbo</p>
                            </div>
                        </button>

                        <button
                            onClick={() => handleProviderSelect('anthropic')}
                            className="flex items-center gap-4 p-4 border border-[var(--gray-6)] rounded-xl hover:border-[var(--orange-8)] hover:bg-[var(--orange-2)] transition-all group text-left"
                        >
                            <div className="w-10 h-10 rounded-lg bg-[var(--orange-3)] flex items-center justify-center text-[var(--orange-9)]">
                                <span className="font-bold">A</span>
                            </div>
                            <div>
                                <h3 className="font-semibold text-[var(--gray-12)] group-hover:text-[var(--orange-11)]">Anthropic</h3>
                                <p className="text-sm text-[var(--gray-10)]">Claude 3 Opus, Sonnet</p>
                            </div>
                        </button>

                        <button
                            onClick={() => handleProviderSelect('google')}
                            className="flex items-center gap-4 p-4 border border-[var(--gray-6)] rounded-xl hover:border-[var(--blue-8)] hover:bg-[var(--blue-2)] transition-all group text-left"
                        >
                            <div className="w-10 h-10 rounded-lg bg-[var(--blue-3)] flex items-center justify-center text-[var(--blue-9)]">
                                <span className="font-bold">G</span>
                            </div>
                            <div>
                                <h3 className="font-semibold text-[var(--gray-12)] group-hover:text-[var(--blue-11)]">Google Gemini</h3>
                                <p className="text-sm text-[var(--gray-10)]">Gemini Pro, Ultra</p>
                            </div>
                        </button>

                        <button
                            onClick={() => handleProviderSelect('mistral')}
                            className="flex items-center gap-4 p-4 border border-[var(--gray-6)] rounded-xl hover:border-[var(--yellow-8)] hover:bg-[var(--yellow-2)] transition-all group text-left"
                        >
                            <div className="w-10 h-10 rounded-lg bg-[var(--yellow-3)] flex items-center justify-center text-[var(--yellow-9)]">
                                <span className="font-bold">M</span>
                            </div>
                            <div>
                                <h3 className="font-semibold text-[var(--gray-12)] group-hover:text-[var(--yellow-11)]">Mistral AI</h3>
                                <p className="text-sm text-[var(--gray-10)]">Mistral Large, Medium</p>
                            </div>
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4 px-6 pb-6 pt-0">
                        <div>
                            <label className="block text-sm font-medium text-[var(--gray-11)] mb-1">
                                API Key <span className="text-[var(--red-9)]">*</span>
                            </label>
                            <input
                                type="password"
                                value={addApiKey}
                                onChange={(e) => setAddApiKey(e.target.value)}
                                className="w-full px-3 py-2 border border-[var(--gray-7)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-8)]"
                                placeholder="sk-..."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[var(--gray-11)] mb-1">
                                Model Type <span className="text-[var(--red-9)]">*</span>
                            </label>
                            {addProvider === 'google' ? (
                                <div className="space-y-2">
                                    <div className="flex gap-2">
                                        <input
                                            value={addModelId}
                                            onChange={(e) => setAddModelId(e.target.value)}
                                            className="flex-1 px-3 py-2 text-sm border border-[var(--gray-7)] rounded-lg"
                                            placeholder="gemini-3.0-flash"
                                        />
                                        <button onClick={fetchGoogleModels} className="text-xs bg-[var(--gray-3)] px-2 rounded border border-[var(--gray-7)]">List</button>
                                    </div>
                                    {availableAddModels.length > 0 && (
                                        <select
                                            onChange={(e) => setAddModelId(e.target.value)}
                                            className="w-full text-sm border p-2 rounded"
                                        >
                                            <option value="">Select...</option>
                                            {availableAddModels.map(m => (
                                                <option key={m.name} value={m.name}>{m.displayName}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            ) : (
                                <select
                                    value={addModelId}
                                    onChange={(e) => setAddModelId(e.target.value)}
                                    className="w-full px-3 py-2 border border-[var(--gray-7)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-8)] bg-[var(--color-background)]"
                                >
                                    <option value="">Select a model...</option>
                                    {DEFAULT_MODELS.filter(m => m.provider === addProvider).map(m => (
                                        <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}
