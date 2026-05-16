"use client";

import React from 'react';
import SectionHeader from "@/components/Shared/SectionHeader";
import PageHeader from "@/components/Shared/PageHeader";
import RadixAccordion from "@/components/Shared/RadixAccordion";
import { 
    CodeIcon, 
    LightningBoltIcon, 
    RocketIcon,
    CheckCircledIcon,
    CubeIcon
} from "@radix-ui/react-icons";

export default function BuildPipelinePage() {
    return (
        <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
            <PageHeader 
                title="Build Pipeline" 
                description="Visualization of the production build process."
            />

            {/* Visual Pipeline */}
            <div className="relative py-8">
                {/* Connecting Line */}
                <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-100 -translate-y-1/2 hidden md:block z-0" />

                <div className="relative z-10 grid grid-cols-1 md:grid-cols-4 gap-4">
                     {/* Step 0: Nixpacks */}
                     <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center text-center group hover:border-orange-300 transition-colors">
                        <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                            <CubeIcon className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-gray-900 text-sm mb-1">1. Environment</h3>
                        <p className="text-xs text-gray-500 font-mono">nixpacks build</p>
                    </div>

                    {/* Step 1: Prisma Generate */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center text-center group hover:border-blue-300 transition-colors">
                        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                            <CodeIcon className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-gray-900 text-sm mb-1">2. Generate Client</h3>
                        <p className="text-xs text-gray-500 font-mono">npx prisma generate</p>
                    </div>

                    {/* Step 2: Next.js Build */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center text-center group hover:border-purple-300 transition-colors">
                        <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                            <RocketIcon className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-gray-900 text-sm mb-1">3. Build Web App</h3>
                        <p className="text-xs text-gray-500 font-mono">next build</p>
                    </div>

                    {/* Step 3: Worker Build */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center text-center group hover:border-amber-300 transition-colors">
                        <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                            <LightningBoltIcon className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-gray-900 text-sm mb-1">4. Build Worker</h3>
                        <p className="text-xs text-gray-500 font-mono">npm run build:worker</p>
                    </div>
                </div>
            </div>

            <SectionHeader 
                title="Detailed Steps" 
                description="Breakdown of each command executed during the build process."
                className="mt-8"
            />

            <RadixAccordion.Root type="multiple" className="w-full space-y-4">
                 <RadixAccordion.Item value="nixpacks" className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    <RadixAccordion.Trigger className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left">
                        <div className="flex items-center gap-3">
                            <div className="bg-orange-100 text-orange-700 p-2 rounded-lg">
                                <CubeIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900">Nixpacks Environment Setup</h4>
                                <code className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-100">Auto-detected</code>
                            </div>
                        </div>
                    </RadixAccordion.Trigger>
                    <RadixAccordion.Content className="p-4 pt-0 border-t border-gray-100 bg-gray-50/30">
                        <div className="py-4 space-y-3">
                            <p className="text-sm text-gray-600">
                                Coolify uses <a href="https://nixpacks.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Nixpacks</a> to analyze the repository and create an optimal container image.
                            </p>
                            <ul className="space-y-2 text-sm text-gray-600">
                                <li className="flex items-start gap-2">
                                    <CheckCircledIcon className="w-4 h-4 text-green-500 mt-0.5" />
                                    <span><strong>Detection:</strong> Identifies Next.js app via <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">package.json</code></span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircledIcon className="w-4 h-4 text-green-500 mt-0.5" />
                                    <span><strong>Environment:</strong> Installs Node.js 20+, Python (for node-gyp), and OpenSSL</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircledIcon className="w-4 h-4 text-green-500 mt-0.5" />
                                    <span><strong>Installation:</strong> Runs <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">npm ci</code> to install dependencies frozen in lockfile</span>
                                </li>
                            </ul>
                        </div>
                    </RadixAccordion.Content>
                </RadixAccordion.Item>

                <RadixAccordion.Item value="prisma" className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    <RadixAccordion.Trigger className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left">
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-100 text-blue-700 p-2 rounded-lg">
                                <CodeIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900">Database Client Generation</h4>
                                <code className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">npx prisma generate</code>
                            </div>
                        </div>
                    </RadixAccordion.Trigger>
                    <RadixAccordion.Content className="p-4 pt-0 border-t border-gray-100 bg-gray-50/30">
                        <div className="py-4 space-y-3">
                            <p className="text-sm text-gray-600">
                                This step reads your <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">schema.prisma</code> file and generates the type-safe Prisma Client library.
                            </p>
                            <ul className="space-y-2 text-sm text-gray-600">
                                <li className="flex items-start gap-2">
                                    <CheckCircledIcon className="w-4 h-4 text-green-500 mt-0.5" />
                                    <span>Creates TypeScript types for all database models</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircledIcon className="w-4 h-4 text-green-500 mt-0.5" />
                                    <span>Updates the client in <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">node_modules/.prisma/client</code></span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircledIcon className="w-4 h-4 text-green-500 mt-0.5" />
                                    <span>Essential for database access in both Next.js and the background worker</span>
                                </li>
                            </ul>
                        </div>
                    </RadixAccordion.Content>
                </RadixAccordion.Item>

                <RadixAccordion.Item value="next" className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    <RadixAccordion.Trigger className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left">
                         <div className="flex items-center gap-3">
                            <div className="bg-purple-100 text-purple-700 p-2 rounded-lg">
                                <RocketIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900">Next.js Application Build</h4>
                                <code className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">next build</code>
                            </div>
                        </div>
                    </RadixAccordion.Trigger>
                    <RadixAccordion.Content className="p-4 pt-0 border-t border-gray-100 bg-gray-50/30">
                         <div className="py-4 space-y-3">
                            <p className="text-sm text-gray-600">
                                Compiles the React application for production using Next.js.
                            </p>
                             <ul className="space-y-2 text-sm text-gray-600">
                                <li className="flex items-start gap-2">
                                    <CheckCircledIcon className="w-4 h-4 text-green-500 mt-0.5" />
                                    <span>Optimizes static assets and images</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircledIcon className="w-4 h-4 text-green-500 mt-0.5" />
                                    <span>Creates server-side rendering (SSR) and static site generation (SSG) pages</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircledIcon className="w-4 h-4 text-green-500 mt-0.5" />
                                    <span>Generates build artifacts in <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">.next/</code> folder</span>
                                </li>
                            </ul>
                        </div>
                    </RadixAccordion.Content>
                </RadixAccordion.Item>

                <RadixAccordion.Item value="worker" className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                     <RadixAccordion.Trigger className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left">
                        <div className="flex items-center gap-3">
                            <div className="bg-amber-100 text-amber-700 p-2 rounded-lg">
                                <LightningBoltIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900">Worker Compilation</h4>
                                <code className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">npm run build:worker</code>
                            </div>
                        </div>
                    </RadixAccordion.Trigger>
                    <RadixAccordion.Content className="p-4 pt-0 border-t border-gray-100 bg-gray-50/30">
                        <div className="py-4 space-y-3">
                            <p className="text-sm text-gray-600">
                                Compiles the background worker process using TypeScript Compiler (tsc).
                            </p>
                            <div className="bg-gray-900 text-gray-300 p-3 rounded-lg text-xs font-mono mb-2">
                                tsc --project tsconfig.worker.json && tsc-alias -p tsconfig.worker.json
                            </div>
                             <ul className="space-y-2 text-sm text-gray-600">
                                <li className="flex items-start gap-2">
                                    <CheckCircledIcon className="w-4 h-4 text-green-500 mt-0.5" />
                                    <span>Compiles worker code to JavaScript in <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">worker-build/</code></span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircledIcon className="w-4 h-4 text-green-500 mt-0.5" />
                                    <span>Resolves path aliases (e.g., using @/lib in worker code)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircledIcon className="w-4 h-4 text-green-500 mt-0.5" />
                                    <span>Runs independently from the Next.js server process</span>
                                </li>
                            </ul>
                        </div>
                    </RadixAccordion.Content>
                </RadixAccordion.Item>
            </RadixAccordion.Root>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                <div>
                     <SectionHeader 
                        title="Resource Optimizations" 
                        description="Configurations to reduce build time and memory usage on the VPS." 
                        className="mb-4"
                    />
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm p-6">
                        <ul className="space-y-4">
                            <li className="flex gap-3">
                                <div className="mt-0.5 bg-green-100 text-green-600 rounded-full p-1 w-fit h-fit">
                                    <CheckCircledIcon className="w-4 h-4" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900 text-sm">Skipped Linting & Type Checking</h4>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        <code className="bg-gray-100 px-1 py-0.5 rounded">eslint.ignoreDuringBuilds</code> and <code className="bg-gray-100 px-1 py-0.5 rounded">typescript.ignoreBuildErrors</code> are enabled to save resources.
                                    </p>
                                </div>
                            </li>
                             <li className="flex gap-3">
                                <div className="mt-0.5 bg-green-100 text-green-600 rounded-full p-1 w-fit h-fit">
                                    <CheckCircledIcon className="w-4 h-4" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900 text-sm">CPU & Memory Limits</h4>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        Experimental <code className="bg-gray-100 px-1 py-0.5 rounded">cpus: 1</code> and <code className="bg-gray-100 px-1 py-0.5 rounded">workerThreads: false</code> prevent Out-Of-Memory (OOM) crashes on small instances.
                                    </p>
                                </div>
                            </li>
                            <li className="flex gap-3">
                                <div className="mt-0.5 bg-green-100 text-green-600 rounded-full p-1 w-fit h-fit">
                                    <CheckCircledIcon className="w-4 h-4" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900 text-sm">No Source Maps</h4>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        <code className="bg-gray-100 px-1 py-0.5 rounded">productionBrowserSourceMaps: false</code> reduces build artifact size and compilation time.
                                    </p>
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>

                <div>
                    <SectionHeader 
                        title="Production Build Script" 
                        description="The full command executed by Coolify/Nixpacks." 
                        className="mb-4"
                    />
                     <div className="bg-gray-900 text-gray-300 p-6 rounded-xl shadow-sm text-sm font-mono overflow-x-auto">
                        <div className="flex flex-col gap-4">
                            <div>
                                <span className="text-gray-500"># 1. Nixpacks detects Next.js</span><br/>
                                <span className="text-yellow-400">nixpacks build . --name spectacl</span>
                            </div>
                            <div>
                                <span className="text-gray-500"># 2. Installs dependencies</span><br/>
                                <span className="text-green-400">npm ci</span>
                            </div>
                            
                            <div>
                                <span className="text-gray-500"># 3. Runs Build Command (package.json)</span><br/>
                                <span className="text-blue-400">npm run build</span>
                                <div className="pl-4 border-l-2 border-gray-700 mt-2 text-xs text-gray-400">
                                    <span>&gt; npx prisma generate</span><br/>
                                    <span>&gt; next build</span><br/>
                                    <span>&gt; npm run build:worker</span>
                                </div>
                            </div>

                             <div>
                                <span className="text-gray-500"># 4. Start Command</span><br/>
                                <span className="text-purple-400">npm run start</span>
                                <div className="pl-4 border-l-2 border-gray-700 mt-2 text-xs text-gray-400">
                                    <span>&gt; npx prisma migrate deploy</span><br/>
                                    <span>&gt; concurrently &quot;next start&quot; &quot;node worker...&quot;</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
