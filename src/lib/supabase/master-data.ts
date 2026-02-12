import { createClient } from "@/utils/supabase/client"

export interface ExpenseType {
  id: string
  name: string
  default_amount: number
  is_active: boolean
}

export async function getExpenseTypes() {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('Master_Expense_Types')
    .select('*')
    .order('Created_At', { ascending: true })

  if (error) {
    console.error('Error fetching expense types:', error)
    return []
  }

  return data.map((item: any) => ({
    id: item.Expense_Type_ID,
    name: item.Expense_Name,
    default_amount: item.Default_Amount,
    is_active: item.Is_Active
  }))
}

export async function addExpenseType(name: string, defaultAmount: number) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('Master_Expense_Types')
    .insert({
        Expense_Name: name,
        Default_Amount: defaultAmount,
        Is_Active: true
    })
    .select()

  return { success: !error, data, error }
}

export async function updateExpenseType(id: string, updates: Partial<ExpenseType>) {
  const supabase = createClient()
  
  const dbUpdates: any = {}
  if (updates.name !== undefined) dbUpdates.Expense_Name = updates.name
  if (updates.default_amount !== undefined) dbUpdates.Default_Amount = updates.default_amount
  if (updates.is_active !== undefined) dbUpdates.Is_Active = updates.is_active

  const { error } = await supabase
    .from('Master_Expense_Types')
    .update(dbUpdates)
    .eq('Expense_Type_ID', id)

  return { success: !error, error }
}

export async function deleteExpenseType(id: string) {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('Master_Expense_Types')
    .delete()
    .eq('Expense_Type_ID', id)

  return { success: !error, error }
}
