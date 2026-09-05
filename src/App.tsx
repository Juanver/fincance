import { useEffect, useState } from 'react';
import AuthView from './components/AuthView';
import Dashboard from './components/Dashboard';
import {
  addCreditCardPayment,
  getCreditCardPayments,
  getCreditLineConfig,
  setInitialCreditLine
} from './lib/creditCardControlService';
import {
  addCreditCardExpense,
  deleteCreditCardExpense,
  getCreditCardExpenses,
  updateCreditCardExpense
} from './lib/creditCardExpenseService';
import { addExpense, deleteExpense, getExpenses, updateExpense } from './lib/expenseService';
import { addIncome, deleteIncome, getIncomes, updateIncome } from './lib/incomeService';
import { getCurrentUser, onAuthStateChange, signInWithPassword, signOut } from './lib/supabase';
import type {
  CreditCardExpense,
  CreditCardPayment,
  Expense,
  Income,
  NewCreditCardPaymentInput,
  NewCreditCardExpenseInput,
  NewExpenseInput,
  NewIncomeInput,
  User
} from './types';

const THEME_STORAGE_KEY = 'finance:theme';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [creditCardExpenses, setCreditCardExpenses] = useState<CreditCardExpense[]>([]);
  const [creditCardPayments, setCreditCardPayments] = useState<CreditCardPayment[]>([]);
  const [creditLine, setCreditLine] = useState<number>(0);
  const [creditLineConfigured, setCreditLineConfigured] = useState(false);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (storedTheme === 'dark') return true;
    if (storedTheme === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem(THEME_STORAGE_KEY, isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (!mounted) return;
        setUser(currentUser);
      } catch (error) {
        if (!mounted) return;
        setConfigError(error instanceof Error ? error.message : 'Error de configuración de Supabase');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void bootstrap();

    let unsubscribe = () => {};
    try {
      unsubscribe = onAuthStateChange((updatedUser) => {
        setUser(updatedUser);
      });
    } catch (error) {
      if (mounted) {
        setConfigError(error instanceof Error ? error.message : 'Error de configuración de Supabase');
      }
    }

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setExpenses([]);
      setCreditCardExpenses([]);
      setCreditCardPayments([]);
      setCreditLine(0);
      setCreditLineConfigured(false);
      setIncomes([]);
      return;
    }

    setFetchError(null);

    Promise.all([
      getExpenses(user),
      getCreditCardExpenses(user),
      getCreditCardPayments(user),
      getCreditLineConfig(user),
      getIncomes(user)
    ])
      .then(([nextExpenses, nextCreditCardExpenses, nextCreditCardPayments, nextCreditLine, nextIncomes]) => {
        setExpenses(nextExpenses);
        setCreditCardExpenses(nextCreditCardExpenses);
        setCreditCardPayments(nextCreditCardPayments);
        setCreditLine(nextCreditLine.credit_limit);
        setCreditLineConfigured(nextCreditLine.is_configured);
        setIncomes(nextIncomes);
      })
      .catch((error: Error) => setFetchError(error.message));
  }, [user]);

  const infoText = 'Autenticación con Supabase Auth (email y contraseña).';

  const handleSignIn = async (email: string, password: string) => {
    const loggedUser = await signInWithPassword(email, password);
    setUser(loggedUser);
  };

  const handleCreateExpense = async (input: NewExpenseInput) => {
    if (!user) return;
    const created = await addExpense(user, input);
    setExpenses((prev) => [...prev, created].sort((a, b) => b.date.localeCompare(a.date)));
  };

  const handleUpdateExpense = async (expenseId: string, input: NewExpenseInput) => {
    if (!user) return;
    const updated = await updateExpense(user, expenseId, input);
    setExpenses((prev) =>
      prev
        .map((expense) => (expense.id === updated.id ? updated : expense))
        .sort((a, b) => b.date.localeCompare(a.date))
    );
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!user) return;
    await deleteExpense(user, expenseId);
    setExpenses((prev) => prev.filter((expense) => expense.id !== expenseId));
  };

  const handleCreateCreditCardExpense = async (input: NewCreditCardExpenseInput) => {
    if (!user) return;
    const created = await addCreditCardExpense(user, input);
    setCreditCardExpenses((prev) => [...prev, created].sort((a, b) => b.date.localeCompare(a.date)));
  };

  const handleUpdateCreditCardExpense = async (expenseId: string, input: NewCreditCardExpenseInput) => {
    if (!user) return;
    const updated = await updateCreditCardExpense(user, expenseId, input);
    setCreditCardExpenses((prev) =>
      prev
        .map((expense) => (expense.id === updated.id ? updated : expense))
        .sort((a, b) => b.date.localeCompare(a.date))
    );
  };

  const handleDeleteCreditCardExpense = async (expenseId: string) => {
    if (!user) return;
    await deleteCreditCardExpense(user, expenseId);
    setCreditCardExpenses((prev) => prev.filter((expense) => expense.id !== expenseId));
  };

  const handleSetInitialCreditLine = async (nextCreditLine: number) => {
    if (!user) return;
    const updated = await setInitialCreditLine(user, nextCreditLine);
    setCreditLine(updated);
    setCreditLineConfigured(true);
  };

  const handleCreateCreditCardPayment = async (input: NewCreditCardPaymentInput) => {
    if (!user) return;
    const created = await addCreditCardPayment(user, input);
    setCreditCardPayments((prev) => [...prev, created].sort((a, b) => b.payment_date.localeCompare(a.payment_date)));
  };

  const handleCreateIncome = async (input: NewIncomeInput) => {
    if (!user) return;
    const created = await addIncome(user, input);
    setIncomes((prev) => [...prev, created].sort((a, b) => b.date.localeCompare(a.date)));
  };

  const handleUpdateIncome = async (incomeId: string, input: NewIncomeInput) => {
    if (!user) return;
    const updated = await updateIncome(user, incomeId, input);
    setIncomes((prev) =>
      prev
        .map((income) => (income.id === updated.id ? updated : income))
        .sort((a, b) => b.date.localeCompare(a.date))
    );
  };

  const handleDeleteIncome = async (incomeId: string) => {
    if (!user) return;
    await deleteIncome(user, incomeId);
    setIncomes((prev) => prev.filter((income) => income.id !== incomeId));
  };

  const handleSignOut = async () => {
    await signOut();
    setUser(null);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Cargando...</div>
    );
  }

  if (!user) {
    return (
      <AuthView
        onSignIn={handleSignIn}
        infoText={configError ? `${infoText} ${configError}` : infoText}
      />
    );
  }

  return (
    <>
      {fetchError && (
        <div className="mx-auto mt-4 w-full max-w-6xl rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {fetchError}
        </div>
      )}

      <Dashboard
        user={user}
        expenses={expenses}
        creditCardExpenses={creditCardExpenses}
        creditCardPayments={creditCardPayments}
        creditLine={creditLine}
        creditLineConfigured={creditLineConfigured}
        incomes={incomes}
        onCreateExpense={handleCreateExpense}
        onUpdateExpense={handleUpdateExpense}
        onDeleteExpense={handleDeleteExpense}
        onCreateCreditCardExpense={handleCreateCreditCardExpense}
        onUpdateCreditCardExpense={handleUpdateCreditCardExpense}
        onDeleteCreditCardExpense={handleDeleteCreditCardExpense}
        onSetInitialCreditLine={handleSetInitialCreditLine}
        onCreateCreditCardPayment={handleCreateCreditCardPayment}
        onCreateIncome={handleCreateIncome}
        onUpdateIncome={handleUpdateIncome}
        onDeleteIncome={handleDeleteIncome}
        onSignOut={handleSignOut}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode((prev) => !prev)}
      />
    </>
  );
}

export default App;
