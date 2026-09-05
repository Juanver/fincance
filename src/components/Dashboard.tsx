import { type FocusEvent, FormEvent, useMemo, useState } from 'react';
import type { Expense, Income, NewExpenseInput, NewIncomeInput, User } from '../types';

type DashboardProps = {
  user: User;
  expenses: Expense[];
  incomes: Income[];
  onCreateExpense: (input: NewExpenseInput) => Promise<void>;
  onUpdateExpense: (expenseId: string, input: NewExpenseInput) => Promise<void>;
  onDeleteExpense: (expenseId: string) => Promise<void>;
  onCreateIncome: (input: NewIncomeInput) => Promise<void>;
  onUpdateIncome: (incomeId: string, input: NewIncomeInput) => Promise<void>;
  onDeleteIncome: (incomeId: string) => Promise<void>;
  onSignOut: () => Promise<void>;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    maximumFractionDigits: 0
  }).format(value);
}

function getTodayLocalDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateOnly(date: string) {
  const [year, month, day] = date.split('T')[0].split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function formatDateOnly(date: string) {
  const [year, month, day] = date.split('T')[0].split('-').map(Number);
  if (!year || !month || !day) return date;

  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('es-CL', {
    timeZone: 'UTC'
  });
}

function calcSpendingAverages(expenses: Expense[]) {
  if (expenses.length === 0) {
    return { totalSpent: 0, dailySpent: 0, monthlySpent: 0 };
  }

  const totalSpent = expenses.reduce((acc, expense) => acc + Number(expense.amount), 0);
  const dates = expenses.map((expense) => parseDateOnly(expense.date)).sort((a, b) => a.getTime() - b.getTime());
  const firstDate = dates[0];
  const now = new Date();

  const diffDays = Math.max(1, Math.ceil((now.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  const diffMonths = Math.max(
    1,
    (now.getFullYear() - firstDate.getFullYear()) * 12 + (now.getMonth() - firstDate.getMonth()) + 1
  );

  return {
    totalSpent,
    dailySpent: totalSpent / diffDays,
    monthlySpent: totalSpent / diffMonths
  };
}

function sumAmountsByDate(items: Array<{ amount: number; date: string }>, untilDate: string) {
  return items
    .filter((item) => item.date <= untilDate)
    .reduce((acc, item) => acc + Number(item.amount), 0);
}

export default function Dashboard({
  user,
  expenses,
  incomes,
  onCreateExpense,
  onUpdateExpense,
  onDeleteExpense,
  onCreateIncome,
  onUpdateIncome,
  onDeleteIncome,
  onSignOut,
  isDarkMode,
  onToggleDarkMode
}: DashboardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [entryType, setEntryType] = useState<'expense' | 'income'>('expense');
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editingIncomeId, setEditingIncomeId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(getTodayLocalDate());
  const [reportDate, setReportDate] = useState(getTodayLocalDate());
  const [loading, setLoading] = useState(false);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);
  const [deletingIncomeId, setDeletingIncomeId] = useState<string | null>(null);
  const [deleteModalData, setDeleteModalData] = useState<{
    id: string;
    title: string;
    type: 'expense' | 'income';
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const spending = useMemo(() => calcSpendingAverages(expenses), [expenses]);
  const totalIncome = useMemo(
    () => incomes.reduce((acc, income) => acc + Number(income.amount), 0),
    [incomes]
  );
  const currentBalance = totalIncome - spending.totalSpent;

  const report = useMemo(() => {
    const incomeUntilDate = sumAmountsByDate(incomes, reportDate);
    const expenseUntilDate = sumAmountsByDate(expenses, reportDate);
    return {
      incomeUntilDate,
      expenseUntilDate,
      balanceUntilDate: incomeUntilDate - expenseUntilDate
    };
  }, [expenses, incomes, reportDate]);

  const handleFieldFocus = (event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const element = event.currentTarget;
    window.setTimeout(() => {
      element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
    }, 180);
  };

  const resetForm = () => {
    setEditingExpenseId(null);
    setEditingIncomeId(null);
    setTitle('');
    setAmount('');
    setDescription('');
    setDate(getTodayLocalDate());
  };

  const openCreateModal = (type: 'expense' | 'income') => {
    setEntryType(type);
    resetForm();
    setError(null);
    setIsModalOpen(true);
  };

  const openEditExpenseModal = (expense: Expense) => {
    setEntryType('expense');
    setEditingExpenseId(expense.id);
    setEditingIncomeId(null);
    setTitle(expense.title);
    setAmount(String(expense.amount));
    setDescription(expense.description ?? '');
    setDate(expense.date);
    setError(null);
    setIsModalOpen(true);
  };

  const openEditIncomeModal = (income: Income) => {
    setEntryType('income');
    setEditingIncomeId(income.id);
    setEditingExpenseId(null);
    setTitle(income.title);
    setAmount(String(income.amount));
    setDescription(income.description ?? '');
    setDate(income.date);
    setError(null);
    setIsModalOpen(true);
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const parsedAmount = Number(amount);
    if (!title.trim()) {
      setError('El título es obligatorio');
      return;
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('El monto debe ser mayor que 0');
      return;
    }

    setLoading(true);
    try {
      if (entryType === 'expense' && editingExpenseId) {
        await onUpdateExpense(editingExpenseId, {
          title,
          amount: parsedAmount,
          description,
          date
        });
      } else if (entryType === 'expense') {
        await onCreateExpense({
          title,
          amount: parsedAmount,
          description,
          date
        });
      } else if (editingIncomeId) {
        await onUpdateIncome(editingIncomeId, {
          title,
          amount: parsedAmount,
          description,
          date
        });
      } else {
        await onCreateIncome({
          title,
          amount: parsedAmount,
          description,
          date
        });
      }

      resetForm();
      setIsModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible guardar los cambios');
    } finally {
      setLoading(false);
    }
  };

  const openDeleteModal = (id: string, title: string, type: 'expense' | 'income') => {
    setDeleteModalData({ id, title, type });
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteModalData) return;

    setError(null);
    try {
      if (deleteModalData.type === 'expense') {
        setDeletingExpenseId(deleteModalData.id);
        await onDeleteExpense(deleteModalData.id);
        if (editingExpenseId === deleteModalData.id) {
          setIsModalOpen(false);
          resetForm();
        }
      } else {
        setDeletingIncomeId(deleteModalData.id);
        await onDeleteIncome(deleteModalData.id);
        if (editingIncomeId === deleteModalData.id) {
          setIsModalOpen(false);
          resetForm();
        }
      }

      setDeleteModalData(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : deleteModalData.type === 'expense'
            ? 'No fue posible eliminar el gasto'
            : 'No fue posible eliminar el ingreso'
      );
    } finally {
      setDeletingExpenseId(null);
      setDeletingIncomeId(null);
    }
  };

  return (
    <div className="min-h-screen px-3 py-4 dark:bg-slate-950 sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl pb-20 sm:pb-0">
        <header className="mb-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Panel general</h1>
            <p className="truncate text-sm text-slate-500 dark:text-slate-400" title={user.email}>
              {user.email}
            </p>
          </div>

          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300 sm:text-sm">
              <span>{isDarkMode ? 'Oscuro' : 'Claro'}</span>
              <button
                type="button"
                role="switch"
                aria-checked={isDarkMode}
                onClick={onToggleDarkMode}
                className={`relative h-6 w-11 rounded-full transition ${
                  isDarkMode ? 'bg-brand-500' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                    isDarkMode ? 'left-[1.35rem]' : 'left-0.5'
                  }`}
                />
              </button>
            </label>

            <button
              onClick={() => void onSignOut()}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 sm:rounded-xl sm:px-4 sm:py-2 sm:text-sm"
            >
              Cerrar sesión
            </button>
          </div>
        </header>

        <section className="grid gap-2.5 sm:gap-4 md:grid-cols-3">
          <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:rounded-2xl sm:p-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">Total ingresado</p>
            <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100 sm:text-2xl">
              {formatCurrency(totalIncome)}
            </p>
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:rounded-2xl sm:p-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">Total gastado</p>
            <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100 sm:text-2xl">
              {formatCurrency(spending.totalSpent)}
            </p>
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:rounded-2xl sm:p-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">Saldo actual</p>
            <p
              className={`mt-2 text-xl font-semibold sm:text-2xl ${
                currentBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatCurrency(currentBalance)}
            </p>
          </article>
        </section>

        <section className="mt-3 grid gap-2.5 sm:mt-4 sm:grid-cols-2 sm:gap-3">
          <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:rounded-2xl sm:p-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">Promedio diario de gasto</p>
            <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100 sm:text-2xl">
              {formatCurrency(spending.dailySpent)}
            </p>
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:rounded-2xl sm:p-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">Promedio mensual de gasto</p>
            <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100 sm:text-2xl">
              {formatCurrency(spending.monthlySpent)}
            </p>
          </article>
        </section>

        <section className="mt-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:mt-4 sm:rounded-2xl sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Reporte hasta una fecha</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Calcula tu saldo acumulado hasta el día seleccionado.</p>
            </div>
            <div className="w-full sm:w-56">
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Fecha de corte</label>
              <input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} />
            </div>
          </div>

          <div className="mt-3 grid gap-2 sm:mt-4 sm:grid-cols-3 sm:gap-3">
            <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/70 sm:rounded-xl sm:p-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">Ingresos acumulados</p>
              <p className="mt-1 text-base font-semibold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(report.incomeUntilDate)}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/70 sm:rounded-xl sm:p-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">Gastos acumulados</p>
              <p className="mt-1 text-base font-semibold text-rose-600 dark:text-rose-400">
                {formatCurrency(report.expenseUntilDate)}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/70 sm:rounded-xl sm:p-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">Saldo acumulado</p>
              <p
                className={`mt-1 text-base font-semibold ${
                  report.balanceUntilDate >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {formatCurrency(report.balanceUntilDate)}
              </p>
            </div>
          </div>
        </section>

        <section className="fixed inset-x-3 bottom-4 z-30 rounded-2xl border border-slate-200/70 bg-white/75 p-2 shadow-lg backdrop-blur-md dark:border-slate-700/70 dark:bg-slate-900/75 sm:static sm:inset-auto sm:mt-6 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-0">
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
            <button
              className="w-full rounded-xl bg-gradient-to-r from-brand-500 via-blue-500 to-indigo-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_-8px_rgba(79,140,255,0.65)] ring-1 ring-white/20 backdrop-blur-sm hover:from-brand-600 hover:via-blue-600 hover:to-indigo-600 sm:w-auto sm:py-2.5"
              onClick={() => openCreateModal('expense')}
            >
              Ingresar gasto
            </button>
            <button
              className="w-full rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_-8px_rgba(16,185,129,0.6)] ring-1 ring-white/20 backdrop-blur-sm hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 sm:w-auto sm:py-2.5"
              onClick={() => openCreateModal('income')}
            >
              Ingresar ingreso
            </button>
          </div>
        </section>

        <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:mt-6">
          <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Gastos recientes</h2>
          </div>

          {expenses.length === 0 ? (
            <p className="p-4 text-sm text-slate-500 dark:text-slate-400">Aún no hay gastos registrados.</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {expenses.map((expense) => (
                <li key={expense.id} className="flex flex-col gap-2 px-4 py-3 sm:gap-3">
                  <div>
                    <p className="break-words font-medium text-slate-900 dark:text-slate-100">{expense.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {formatDateOnly(expense.date)}
                    </p>
                    {expense.description && (
                      <p className="mt-1 break-words text-sm text-slate-600 dark:text-slate-300">{expense.description}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <p className="w-fit rounded-lg bg-brand-50 px-2.5 py-1 text-base font-semibold text-brand-600 sm:bg-transparent sm:px-0 sm:py-0 sm:text-lg">
                      {formatCurrency(Number(expense.amount))}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditExpenseModal(expense)}
                        className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        disabled={deletingExpenseId === expense.id}
                        onClick={() => openDeleteModal(expense.id, expense.title, 'expense')}
                        className="rounded-lg border border-rose-300 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-70 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950/30"
                      >
                        {deletingExpenseId === expense.id ? 'Eliminando...' : 'Eliminar'}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Ingresos recientes</h2>
          </div>

          {incomes.length === 0 ? (
            <p className="p-4 text-sm text-slate-500 dark:text-slate-400">Aún no hay ingresos registrados.</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {incomes.map((income) => (
                <li key={income.id} className="flex flex-col gap-2 px-4 py-3 sm:gap-3">
                  <div>
                    <p className="break-words font-medium text-slate-900 dark:text-slate-100">{income.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {formatDateOnly(income.date)}
                    </p>
                    {income.description && (
                      <p className="mt-1 break-words text-sm text-slate-600 dark:text-slate-300">{income.description}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <p className="w-fit rounded-lg bg-emerald-50 px-2.5 py-1 text-base font-semibold text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 sm:bg-transparent sm:px-0 sm:py-0 sm:text-lg">
                      {formatCurrency(Number(income.amount))}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditIncomeModal(income)}
                        className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        disabled={deletingIncomeId === income.id}
                        onClick={() => openDeleteModal(income.id, income.title, 'income')}
                        className="rounded-lg border border-rose-300 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-70 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950/30"
                      >
                        {deletingIncomeId === income.id ? 'Eliminando...' : 'Eliminar'}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex min-h-[100dvh] items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:px-4 sm:py-6">
          <div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] shadow-lg dark:bg-slate-900 sm:max-h-none sm:max-w-md sm:rounded-2xl sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {entryType === 'expense'
                  ? editingExpenseId
                    ? 'Editar gasto'
                    : 'Nuevo gasto'
                  : editingIncomeId
                    ? 'Editar ingreso'
                    : 'Nuevo ingreso'}
              </h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
                className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <form className="space-y-3" onSubmit={handleCreate}>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Título *</label>
                <input value={title} onFocus={handleFieldFocus} onChange={(e) => setTitle(e.target.value)} required />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Monto/Costo *</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={amount}
                    onFocus={handleFieldFocus}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Fecha</label>
                  <input type="date" value={date} onFocus={handleFieldFocus} onChange={(e) => setDate(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Descripción</label>
                <textarea
                  rows={3}
                  value={description}
                  onFocus={handleFieldFocus}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {error && <p className="rounded-lg bg-rose-50 p-2 text-sm text-rose-700">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className={`mt-2 w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-70 ${
                  entryType === 'expense'
                    ? editingExpenseId
                      ? 'bg-amber-500 hover:bg-amber-600'
                      : 'bg-brand-500 hover:bg-brand-600'
                    : 'bg-emerald-500 hover:bg-emerald-600'
                }`}
              >
                {loading
                  ? 'Guardando...'
                  : entryType === 'expense'
                    ? editingExpenseId
                      ? 'Guardar cambios'
                      : 'Guardar gasto'
                    : editingIncomeId
                      ? 'Guardar cambios'
                      : 'Guardar ingreso'}
              </button>
            </form>
          </div>
        </div>
      )}

      {deleteModalData && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:px-4 sm:py-6">
          <div className="w-full rounded-t-2xl bg-white p-4 shadow-lg dark:bg-slate-900 sm:max-w-sm sm:rounded-2xl sm:p-5">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Confirmar eliminación</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              ¿Seguro que quieres eliminar {deleteModalData.type === 'expense' ? 'el gasto' : 'el ingreso'} "
              {deleteModalData.title}"? Esta acción no se puede deshacer.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDeleteModalData(null)}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={Boolean(deletingExpenseId || deletingIncomeId)}
                onClick={() => void handleDeleteConfirmed()}
                className="rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-70"
              >
                {deletingExpenseId || deletingIncomeId ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
