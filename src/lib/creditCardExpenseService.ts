import type { CreditCardExpense, NewCreditCardExpenseInput, User } from '../types';
import { supabase } from './supabase';

function normalizeCreditCardExpenses(expenses: CreditCardExpense[]) {
  return [...expenses].sort((a, b) => b.date.localeCompare(a.date));
}

export async function getCreditCardExpenses(user: User): Promise<CreditCardExpense[]> {
  if (!supabase) {
    throw new Error('Supabase no está configurado. Define NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }

  const { data, error } = await supabase
    .from('credit_card_expenses')
    .select('id, title, amount, description, date, expense_type, user_id, created_at')
    .eq('user_id', user.id)
    .order('date', { ascending: false });

  if (error) throw new Error(error.message);

  return normalizeCreditCardExpenses((data ?? []) as CreditCardExpense[]);
}

export async function addCreditCardExpense(user: User, input: NewCreditCardExpenseInput): Promise<CreditCardExpense> {
  if (!supabase) {
    throw new Error('Supabase no está configurado. Define NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }

  const { data, error } = await supabase
    .from('credit_card_expenses')
    .insert({
      title: input.title.trim(),
      amount: Number(input.amount),
      description: input.description?.trim() || null,
      date: input.date,
      expense_type: input.expense_type,
      user_id: user.id
    })
    .select('id, title, amount, description, date, expense_type, user_id, created_at')
    .single();

  if (error) throw new Error(error.message);
  return data as CreditCardExpense;
}

export async function updateCreditCardExpense(
  user: User,
  expenseId: string,
  input: NewCreditCardExpenseInput
): Promise<CreditCardExpense> {
  if (!supabase) {
    throw new Error('Supabase no está configurado. Define NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }

  const { data, error } = await supabase
    .from('credit_card_expenses')
    .update({
      title: input.title.trim(),
      amount: Number(input.amount),
      description: input.description?.trim() || null,
      date: input.date,
      expense_type: input.expense_type
    })
    .eq('id', expenseId)
    .eq('user_id', user.id)
    .select('id, title, amount, description, date, expense_type, user_id, created_at')
    .single();

  if (error) throw new Error(error.message);
  return data as CreditCardExpense;
}

export async function deleteCreditCardExpense(user: User, expenseId: string): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase no está configurado. Define NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }

  const { error } = await supabase
    .from('credit_card_expenses')
    .delete()
    .eq('id', expenseId)
    .eq('user_id', user.id);

  if (error) throw new Error(error.message);
}
