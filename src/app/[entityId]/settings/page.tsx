import PageHeader from "@/components/Shared/PageHeader";

export default function SettingsPage() {
    return (
        <div className="space-y-6">
            <PageHeader
                title="Settings"
                description="Manage your account and preferences"
                
            />

            <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-200">
                <div className="p-6">
                    <h3 className="font-semibold text-gray-900 mb-1">Check Frequency</h3>
                    <p className="text-sm text-gray-500 mb-4">How often to check entity visibility</p>
                    <select className="w-full max-w-xs bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
                        <option>Every 24 hours</option>
                        <option>Every 12 hours</option>
                        <option>Every 6 hours</option>
                    </select>
                </div>

                <div className="p-6">
                    <h3 className="font-semibold text-gray-900 mb-1">API Keys</h3>
                    <p className="text-sm text-gray-500 mb-4">Configure LLM API keys</p>
                    <button className="btn-tertiary">
                        Manage API Keys
                    </button>
                </div>

                <div className="p-6">
                    <h3 className="font-semibold text-gray-900 mb-1">Notifications</h3>
                    <p className="text-sm text-gray-500 mb-4">Email notifications for significant changes</p>
                    <label className="flex items-center gap-3">
                        <input type="checkbox" className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                        <span className="text-sm text-gray-700">Send daily summary emails</span>
                    </label>
                </div>
            </div>
        </div>
    );
}
