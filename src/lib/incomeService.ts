import type { Income, NewIncomeInput, User } from '../types';
import { supabase } from './supabase';

function normalizeIncomes(incomes: Income[]) {
  return [...incomes].sort((a, b) => b.date.localeCompare(a.date));
}

export async function getIncomes(user: User): Promise<Income[]> {
  if (!supabase) {
    throw new Error('Supabase no está configurado. Define NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }

  const { data, error } = await supabase
    .from('incomes')
    .select('id, title, amount, description, date, user_id, created_at')
    .eq('user_id', user.id)
    .order('date', { ascending: false });

  if (error) throw new Error(error.message);

  return normalizeIncomes((data ?? []) as Income[]);
}

export async function addIncome(user: User, input: NewIncomeInput): Promise<Income> {
  const payload: Income = {
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
    .from('incomes')
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
  return data as Income;
}

export async function updateIncome(user: User, incomeId: string, input: NewIncomeInput): Promise<Income> {
  if (!supabase) {
    throw new Error('Supabase no está configurado. Define NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }

  const { data, error } = await supabase
    .from('incomes')
    .update({
      title: input.title.trim(),
      amount: Number(input.amount),
      description: input.description?.trim() || null,
      date: input.date
    })
    .eq('id', incomeId)
    .eq('user_id', user.id)
    .select('id, title, amount, description, date, user_id, created_at')
    .single();

  if (error) throw new Error(error.message);
  return data as Income;
}

export async function deleteIncome(user: User, incomeId: string): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase no está configurado. Define NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }

  const { error } = await supabase
    .from('incomes')
    .delete()
    .eq('id', incomeId)
    .eq('user_id', user.id);

  if (error) throw new Error(error.message);
}
