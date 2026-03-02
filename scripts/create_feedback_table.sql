-- SQL to create the job_feedback table
CREATE TABLE IF NOT EXISTS job_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id TEXT NOT NULL,
    rating INTEGER CHECK (
        rating >= 1
        AND rating <= 5
    ),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_job_feedback_job_id ON job_feedback(job_id);
-- Link to Jobs_Main (Optional but recommended for integrity if possible, 
-- though Jobs_Main uses TEXT for ID and might be across schemas)
-- ALTER TABLE job_feedback ADD CONSTRAINT fk_job FOREIGN KEY (job_id) REFERENCES "Jobs_Main"("Job_ID");