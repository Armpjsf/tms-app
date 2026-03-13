import { validateApiKey } from '@/lib/security/api-security'

/**
 * Enterprise Integration API (v1)
 * Allows external ERP/SAP systems to create jobs automatically.
 */
export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get('Authorization')
        
        // Industrial-grade API Key validation across Master_API_Keys registry
        let clientContext
        try {
            clientContext = await validateApiKey(authHeader || '')
        } catch (authError: Error | any) {
            return NextResponse.json({ error: authError.message }, { status: 401 })
        }

        const body = await req.json()
        const { 
            customer_id, 
            pickup_address, 
            delivery_address, 
            items, 
            vehicle_type,
            plan_date 
        } = body

        // Validation
        if (!customer_id || !pickup_address || !delivery_address) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const supabase = await createClient()

        // Insert new job
        const { data, error } = await supabase
            .from('Jobs_Main')
            .insert([{
                Customer_ID: customer_id,
                Pickup_Address: pickup_address,
                Delivery_Address: delivery_address,
                Job_Details: items,
                Vehicle_Type: vehicle_type,
                Plan_Date: plan_date || new Date().toISOString().split('T')[0],
                Job_Status: 'New',
                Source: 'Enterprise_API'
            }])
            .select()

        if (error) throw error

        return NextResponse.json({ 
            success: true, 
            message: 'Job created via Enterprise API',
            job_id: data[0].Job_ID 
        }, { status: 201 })

    } catch (err) {
        console.error('API Error:', err)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
