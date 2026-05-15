import React from 'react';
import RoadmapContent from './RoadmapContent';
import { getSchema } from '@/lib/schemaParser';

export default async function Page() {
    const schema = getSchema();

    return <RoadmapContent schema={schema} />;
}
