import { createClient } from '@/utils/supabase/server'

export type WalletTransaction = {
    user_id: string
    type: 'Deposit' | 'Withdraw' | 'Job_Payment' | 'Commission'
    amount: number
    status: 'Pending' | 'Completed' | 'Failed'
    reference_id?: string
}

/**
 * Smart Wallet & Settlement Service
 * Manages financial balances for customers and drivers.
 */
export async function getWalletBalance(userId: string): Promise<number> {
    const supabase = await createClient()
    const { data } = await supabase
        .from('Wallet_Transactions')
        .select('amount')
        .eq('user_id', userId)
        .eq('status', 'Completed')
    
    return data?.reduce((sum, tx) => sum + tx.amount, 0) || 0
}

/**
 * Processes payment for a completed job.
 * Automatically handles driver settlement and platform commission.
 */
export async function processJobSettlement(jobId: string, totalAmount: number, driverId: string) {
    const commissionRate = 0.10 // 10% Platform fee
    const commission = totalAmount * commissionRate
    const driverEarnings = totalAmount - commission

    const supabase = await createClient()

    // 1. Deduct from Customer (or record payment)
    // 2. Add to Driver's Wallet
    await supabase.from('Wallet_Transactions').insert([
        {
            user_id: driverId,
            type: 'Job_Payment',
            amount: driverEarnings,
            status: 'Completed',
            reference_id: jobId
        },
        {
            user_id: 'SYSTEM_ADMIN', // Platform earnings
            type: 'Commission',
            amount: commission,
            status: 'Completed',
            reference_id: jobId
        }
    ])

    return { success: true, driverEarnings, commission }
}
