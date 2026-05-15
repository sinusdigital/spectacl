const { updateEntityMetrics, getLatestMetrics } = require('./src/lib/metrics');

async function main() {
    const entityId = '215c7268-1d2e-4b4e-bd0b-54110d7b6ad6';
    console.log('Running updateEntityMetrics...');
    await updateEntityMetrics(entityId);
    
    console.log('\nFetching latest metrics...');
    const result = await getLatestMetrics(entityId);
    
    console.dir(result, { depth: null });
    process.exit(0);
}

main().catch(console.error);
