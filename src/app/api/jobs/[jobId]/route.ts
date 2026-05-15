import { NextResponse } from "next/server";
import { analysisQueue } from "@/lib/queue/analysisQueue";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ jobId: string }> }
) {
    try {
        const { jobId } = await params;
        const job = await analysisQueue.getJob(jobId);
        
        if (!job) {
             return NextResponse.json({ status: 'not-found' });
        }
        
        const state = await job.getState();
        return NextResponse.json({ status: state });
    } catch (error) {
        console.error("Error fetching job:", error);
        return NextResponse.json({ error: "Failed to fetch job" }, { status: 500 });
    }
}
