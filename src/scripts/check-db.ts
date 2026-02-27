import { createClient } from '@/utils/supabase/server'

async function checkSchema() {
    try {
        const supabase = await createClient()
        
        // Try a raw query to check columns
        const { data, error } = await supabase
            .from('Chat_Messages')
            .select('*')
            .limit(1)

        console.log('--- Chat_Messages Check ---')
        if (error) {
            console.error('Error fetching Chat_Messages:', error)
        } else {
            console.log('Success! Data sample:', data)
            console.log('Columns:', data.length > 0 ? Object.keys(data[0]) : 'No data to check columns')
        }

        const { data: data2, error: error2 } = await supabase
            .from('chat_messages')
            .select('*')
            .limit(1)

        console.log('\n--- chat_messages (lowercase) Check ---')
        if (error2) {
            console.error('Error fetching chat_messages:', error2)
        } else {
            console.log('Success! Data sample:', data2)
            console.log('Columns:', data2.length > 0 ? Object.keys(data2[0]) : 'No data to check columns')
        }

    } catch (err) {
        console.error('Execution error:', err)
    }
}

checkSchema()
