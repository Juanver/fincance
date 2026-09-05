import type { CreditCardPayment, CreditLineConfig, NewCreditCardPaymentInput, User } from '../types';
import { supabase } from './supabase';

function normalizePayments(payments: CreditCardPayment[]) {
  return [...payments].sort((a, b) => b.payment_date.localeCompare(a.payment_date));
}

export async function getCreditLineConfig(user: User): Promise<CreditLineConfig> {
  if (!supabase) {
    throw new Error('Supabase no está configurado. Define NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }

  const { data, error } = await supabase
    .from('credit_card_lines')
    .select('credit_limit')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) throw new Error(error.message);

  if (!data) {
    return { credit_limit: 0, is_configured: false };
  }

  return {
    credit_limit: Number(data.credit_limit ?? 0),
    is_configured: true
  };
}

export async function setInitialCreditLine(user: User, creditLimit: number): Promise<number> {
  if (!supabase) {
    throw new Error('Supabase no está configurado. Define NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }

  const { data: exists, error: existsError } = await supabase
    .from('credit_card_lines')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (existsError) throw new Error(existsError.message);
  if (exists) {
    throw new Error('La línea de crédito inicial ya fue registrada para esta cuenta.');
  }

  const { data, error } = await supabase
    .from('credit_card_lines')
    .insert({
      user_id: user.id,
      credit_limit: Number(creditLimit),
      started_at: new Date().toISOString().slice(0, 10)
    })
    .select('credit_limit')
    .single();

  if (error) throw new Error(error.message);

  return Number(data.credit_limit ?? 0);
}

export async function addCreditCardPayment(user: User, input: NewCreditCardPaymentInput): Promise<CreditCardPayment> {
  if (!supabase) {
    throw new Error('Supabase no está configurado. Define NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }

  const paymentDate = input.payment_date;
  const [periodYear, periodMonth] = paymentDate.split('-').map(Number);

  const { data, error } = await supabase
    .from('credit_card_payments')
    .insert({
      user_id: user.id,
      amount: Number(input.amount),
      payment_date: paymentDate,
      period_year: periodYear,
      period_month: periodMonth,
      note: input.note?.trim() || null
    })
    .select('id, amount, payment_date, note, user_id, created_at')
    .single();

  if (error) throw new Error(error.message);

  return data as CreditCardPayment;
}

export async function getCreditCardPayments(user: User): Promise<CreditCardPayment[]> {
  if (!supabase) {
    throw new Error('Supabase no está configurado. Define NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }

  const { data, error } = await supabase
    .from('credit_card_payments')
    .select('id, amount, payment_date, note, user_id, created_at')
    .eq('user_id', user.id)
    .order('payment_date', { ascending: false });

  if (error) throw new Error(error.message);

  return normalizePayments((data ?? []) as CreditCardPayment[]);
}
