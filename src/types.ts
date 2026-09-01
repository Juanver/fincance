export type User = {
  id: string;
  email: string;
};

export type Expense = {
  id: string;
  title: string;
  amount: number;
  description?: string;
  date: string;
  user_id?: string;
  created_at?: string;
};

export type NewExpenseInput = {
  title: string;
  amount: number;
  description?: string;
  date: string;
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
