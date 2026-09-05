import type { Expense, NewExpenseInput, User } from '../types';
import { supabase } from './supabase';

function normalizeExpenses(expenses: Expense[]) {
  return [...expenses].sort((a, b) => b.date.localeCompare(a.date));
}

export async function getExpenses(user: User): Promise<Expense[]> {
  if (!supabase) {
    throw new Error('Supabase no está configurado. Define NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }

  const { data, error } = await supabase
    .from('expenses')
    .select('id, title, amount, description, date, user_id, created_at')
    .eq('user_id', user.id)
    .order('date', { ascending: false });

  if (error) throw new Error(error.message);

  return normalizeExpenses((data ?? []) as Expense[]);
}

export async function addExpense(user: User, input: NewExpenseInput): Promise<Expense> {
  const payload: Expense = {
    id: crypto.randomUUID(),
    title: input.title.trim(),
    amount: Number(input.amount),
    description: input.description?.trim() || undefined,
    date: input.date,
    user_id: user.id,
    created_at: new Date().toISOString()
  };

  if (!supabase) {
    throw new Error('Supabase no está configurado. Define NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }

  const { data, error } = await supabase
    .from('expenses')
    .insert({
      title: payload.title,
      amount: payload.amount,
      description: payload.description,
      date: payload.date,
      user_id: payload.user_id
    })
    .select('id, title, amount, description, date, user_id, created_at')
    .single();

  if (error) throw new Error(error.message);
  return data as Expense;
}

export async function updateExpense(user: User, expenseId: string, input: NewExpenseInput): Promise<Expense> {
  if (!supabase) {
    throw new Error('Supabase no está configurado. Define NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }

  const { data, error } = await supabase
    .from('expenses')
    .update({
      title: input.title.trim(),
      amount: Number(input.amount),
      description: input.description?.trim() || null,
      date: input.date
    })
    .eq('id', expenseId)
    .eq('user_id', user.id)
    .select('id, title, amount, description, date, user_id, created_at')
    .single();

  if (error) throw new Error(error.message);
  return data as Expense;
}

export async function deleteExpense(user: User, expenseId: string): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase no está configurado. Define NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }

  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', expenseId)
    .eq('user_id', user.id);

  if (error) throw new Error(error.message);
}
