export interface EvaluationMetrics {
    score: number; // 0-100
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    onTimeRate: number;
    successRate: number;
    rating: number;
    incentiveAmount?: number; // For Company Drivers
    renewalIndex?: number;    // 0-100, For Subcontractors
}

/**
 * Advanced Driver Evaluation Engine
 * Calculations for Incentive (Company) and Renewal (Subcontractor)
 */
export function evaluateDriverPerformance(
    stats: {
        completedJobs: number;
        totalJobs: number;
        onTimeJobs: number;
        avgRating: number;
        totalEarnings: number;
        isSubcontractor: boolean;
    }
): EvaluationMetrics {
    const successRate = stats.totalJobs > 0 ? (stats.completedJobs / stats.totalJobs) * 100 : 0;
    const onTimeRate = stats.completedJobs > 0 ? (stats.onTimeJobs / stats.completedJobs) * 100 : 0;
    
    // Weighting: On-time (40%), Success (40%), Rating (20%)
    let score = (onTimeRate * 0.4) + (successRate * 0.4) + ((stats.avgRating / 5) * 100 * 0.2);
    
    // Default score if no jobs
    if (stats.totalJobs === 0) score = 0;

    let grade: EvaluationMetrics['grade'] = 'F';
    if (score >= 90) grade = 'A';
    else if (score >= 80) grade = 'B';
    else if (score >= 70) grade = 'C';
    else if (score >= 50) grade = 'D';

    const metrics: EvaluationMetrics = {
        score: Math.round(score),
        grade,
        onTimeRate: Math.round(onTimeRate),
        successRate: Math.round(successRate),
        rating: stats.avgRating
    };

    if (stats.isSubcontractor) {
        // Renewal Index for Subcontractors: High penalty for cancellations or low ratings
        metrics.renewalIndex = Math.max(0, Math.round(score * 0.9)); // Conservative renewal index
    } else {
        // Incentive for Company Drivers (e.g., 500 per A-grade, 200 per B-grade)
        let incentive = 0;
        if (grade === 'A') incentive = 1000;
        else if (grade === 'B') incentive = 500;
        else if (grade === 'C') incentive = 200;
        
        metrics.incentiveAmount = incentive;
    }

    return metrics;
}
