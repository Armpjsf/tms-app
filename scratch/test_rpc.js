
async function testRPC() {
    const url = 'https://jhksvhujsrbkeyzpvpog.supabase.co/rest/v1/rpc/get_executive_summary';
    const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impoa3N2aHVqc3Jia2V5enB2cG9nIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTg4OTYzOSwiZXhwIjoyMDgxNDY1NjM5fQ.usBqbrhcceLEdQN48ZSZxfFFFfsJG0cZbfYJYNa2kfM';
    
    const body = {
        start_date: "2026-04-01",
        end_date: "2026-04-30",
        filter_branch_id: null,
        filter_customer_id: null
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        const data = await response.json();
        console.log('RPC Result:', JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Fetch Error:', e);
    }
}

testRPC();
