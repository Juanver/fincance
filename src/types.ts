export type User = {
  id: string;
  email: string;
};

export type ExpenseType =
  | 'comida'
  | 'deudas'
  | 'futbol'
  | 'medicina'
  | 'departamento'
  | 'servicios'
  | 'entretenimiento'
  | 'otros';

export type ExpenseScope = 'daily' | 'credit_card';

export type Expense = {
  id: string;
  title: string;
  amount: number;
  description?: string;
  date: string;
  expense_type?: ExpenseType;
  expense_scope?: ExpenseScope;
  user_id?: string;
  created_at?: string;
};

export type NewExpenseInput = {
  title: string;
  amount: number;
  description?: string;
  date: string;
  expense_type: ExpenseType;
  expense_scope: ExpenseScope;
};

export type CreditCardExpense = {
  id: string;
  title: string;
  amount: number;
  description?: string;
  date: string;
  expense_type?: ExpenseType;
  user_id?: string;
  created_at?: string;
};

export type NewCreditCardExpenseInput = {
  title: string;
  amount: number;
  description?: string;
  date: string;
  expense_type: ExpenseType;
};

export type CreditCardPayment = {
  id: string;
  amount: number;
  payment_date: string;
  note?: string;
  user_id?: string;
  created_at?: string;
};

export type NewCreditCardPaymentInput = {
  amount: number;
  payment_date: string;
  note?: string;
};

export type CreditLineConfig = {
  credit_limit: number;
  is_configured: boolean;
};

export type Income = {
  id: string;
  title: string;
  amount: number;
  description?: string;
  date: string;
  user_id?: string;
  created_at?: string;
};

export type NewIncomeInput = {
  title: string;
  amount: number;
  description?: string;
  date: string;
};
