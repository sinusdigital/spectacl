"use client";

import React, { useState } from 'react';
import PageContainer, { HeaderConfig } from "@/components/Shared/PageContainer";
import Button from "@/components/Shared/Button";

export default function ContainerDemoPage() {
    const [isSticky1, setIsSticky1] = useState(true);
    const [isSticky2, setIsSticky2] = useState(true);

    const headers: HeaderConfig[] = [
        {
            content: (
                <div className="flex items-center justify-between w-full">
                    <span className="font-bold">Header 1 (Red)</span>
                    <Button size="sm" onClick={() => setIsSticky1(!isSticky1)}>
                        {isSticky1 ? "Make Non-Sticky" : "Make Sticky"}
                    </Button>
                </div>
            ),
            sticky: isSticky1,
            height: 75,
            className: "bg-red-50/80"
        },
        {
            content: (
                <div className="flex items-center justify-between w-full">
                    <span className="font-bold">Header 2 (Blue)</span>
                    <Button size="sm" onClick={() => setIsSticky2(!isSticky2)}>
                        {isSticky2 ? "Make Non-Sticky" : "Make Sticky"}
                    </Button>
                </div>
            ),
            sticky: isSticky2,
            height: 60,
            className: "bg-blue-50/80"
        }
    ];

    return (
        <PageContainer headers={headers}>
            <div className="space-y-4 p-4">
                <h1 className="text-xl font-bold">Content Area</h1>
                <p>Scroll down to see stacking behavior.</p>
                {Array.from({ length: 50 }).map((_, i) => (
                    <div key={i} className="p-8 bg-gray-100 rounded-lg border border-gray-200">
                        Scroll Item {i + 1}
                    </div>
                ))}
            </div>
        </PageContainer>
    );
}
