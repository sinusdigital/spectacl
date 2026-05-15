import React from "react";
import RadixTable from "./RadixTable";
import Skeleton from "./Skeleton";

interface TableSkeletonProps {
    columnCount: number;
    rowCount?: number;
    variant?: 'surface' | 'ghost';
}

export default function TableSkeleton({ 
    columnCount, 
    rowCount = 5,
    variant = 'surface'
}: TableSkeletonProps) {
    return (
        <RadixTable.Root variant={variant}>
            <RadixTable.Header>
                <RadixTable.Row>
                    {Array.from({ length: columnCount }).map((_, i) => (
                        <RadixTable.Head key={i}>
                            <Skeleton className="h-4 w-24" />
                        </RadixTable.Head>
                    ))}
                </RadixTable.Row>
            </RadixTable.Header>
            <RadixTable.Body>
                {Array.from({ length: rowCount }).map((_, rowIndex) => (
                    <RadixTable.Row key={rowIndex}>
                        {Array.from({ length: columnCount }).map((_, colIndex) => (
                            <RadixTable.Cell key={colIndex}>
                                <Skeleton className={`h-4 ${colIndex === 0 ? 'w-32' : 'w-20'}`} />
                            </RadixTable.Cell>
                        ))}
                    </RadixTable.Row>
                ))}
            </RadixTable.Body>
        </RadixTable.Root>
    );
}
