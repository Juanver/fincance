import { useEffect, useState } from 'react';
import AuthView from './components/AuthView';
import Dashboard from './components/Dashboard';
import { addExpense, deleteExpense, getExpenses, updateExpense } from './lib/expenseService';
import { addIncome, deleteIncome, getIncomes, updateIncome } from './lib/incomeService';
import { getCurrentUser, onAuthStateChange, signInWithPassword, signOut } from './lib/supabase';
import type { Expense, Income, NewExpenseInput, NewIncomeInput, User } from './types';

const THEME_STORAGE_KEY = 'finance:theme';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
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
      setIncomes([]);
      return;
    }

    setFetchError(null);

    Promise.all([getExpenses(user), getIncomes(user)])
      .then(([nextExpenses, nextIncomes]) => {
        setExpenses(nextExpenses);
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
    setExpenses((prev) =>
      [...prev, created].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    );
  };

  const handleUpdateExpense = async (expenseId: string, input: NewExpenseInput) => {
    if (!user) return;
    const updated = await updateExpense(user, expenseId, input);
    setExpenses((prev) =>
      prev
        .map((expense) => (expense.id === updated.id ? updated : expense))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    );
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!user) return;
    await deleteExpense(user, expenseId);
    setExpenses((prev) => prev.filter((expense) => expense.id !== expenseId));
  };

  const handleCreateIncome = async (input: NewIncomeInput) => {
    if (!user) return;
    const created = await addIncome(user, input);
    setIncomes((prev) =>
      [...prev, created].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    );
  };

  const handleUpdateIncome = async (incomeId: string, input: NewIncomeInput) => {
    if (!user) return;
    const updated = await updateIncome(user, incomeId, input);
    setIncomes((prev) =>
      prev
        .map((income) => (income.id === updated.id ? updated : income))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
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
        incomes={incomes}
        onCreateExpense={handleCreateExpense}
        onUpdateExpense={handleUpdateExpense}
        onDeleteExpense={handleDeleteExpense}
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
