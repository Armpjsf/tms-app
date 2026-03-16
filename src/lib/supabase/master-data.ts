"use server"

import { createClient, createAdminClient } from "@/utils/supabase/server"
import { isSuperAdmin, isAdmin } from "@/lib/permissions"

export interface ExpenseType {
  id: string
  name: string
  default_amount: number
  is_active: boolean
}

export async function getExpenseTypes() {
  const isSuper = await isSuperAdmin()
  const isAdminUser = await isAdmin()
  const supabase = (isSuper || isAdminUser) ? await createAdminClient() : await createClient()
  
  const { data, error } = await supabase
    .from('Master_Expense_Types')
    .select('*')
    .order('Created_At', { ascending: true })

  if (error) {
    return []
  }

  return data.map((item: { Expense_Type_ID: string; Expense_Name: string; Default_Amount: number; Is_Active: boolean }) => ({
    id: item.Expense_Type_ID,
    name: item.Expense_Name,
    default_amount: item.Default_Amount,
    is_active: item.Is_Active
  }))
}

export async function addExpenseType(name: string, defaultAmount: number) {
  const isSuper = await isSuperAdmin()
  const isAdminUser = await isAdmin()
  const supabase = (isSuper || isAdminUser) ? await createAdminClient() : await createClient()
  
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
  const isSuper = await isSuperAdmin()
  const isAdminUser = await isAdmin()
  const supabase = (isSuper || isAdminUser) ? await createAdminClient() : await createClient()
  
  const dbUpdates: Record<string, unknown> = {}
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
  const isSuper = await isSuperAdmin()
  const isAdminUser = await isAdmin()
  const supabase = (isSuper || isAdminUser) ? await createAdminClient() : await createClient()
  
  const { error } = await supabase
    .from('Master_Expense_Types')
    .delete()
    .eq('Expense_Type_ID', id)

  return { success: !error, error }
}
