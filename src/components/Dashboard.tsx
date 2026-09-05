import { type FocusEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import type {
  CreditCardExpense,
  CreditCardPayment,
  Expense,
  ExpenseScope,
  ExpenseType,
  Income,
  NewCreditCardPaymentInput,
  NewCreditCardExpenseInput,
  NewExpenseInput,
  NewIncomeInput,
  User
} from '../types';

type DashboardProps = {
  user: User;
  expenses: Expense[];
  creditCardExpenses: CreditCardExpense[];
  creditCardPayments: CreditCardPayment[];
  creditLine: number;
  creditLineConfigured: boolean;
  incomes: Income[];
  onCreateExpense: (input: NewExpenseInput) => Promise<void>;
  onUpdateExpense: (expenseId: string, input: NewExpenseInput) => Promise<void>;
  onDeleteExpense: (expenseId: string) => Promise<void>;
  onCreateCreditCardExpense: (input: NewCreditCardExpenseInput) => Promise<void>;
  onUpdateCreditCardExpense: (expenseId: string, input: NewCreditCardExpenseInput) => Promise<void>;
  onDeleteCreditCardExpense: (expenseId: string) => Promise<void>;
  onSetInitialCreditLine: (creditLine: number) => Promise<void>;
  onCreateCreditCardPayment: (input: NewCreditCardPaymentInput) => Promise<void>;
  onCreateIncome: (input: NewIncomeInput) => Promise<void>;
  onUpdateIncome: (incomeId: string, input: NewIncomeInput) => Promise<void>;
  onDeleteIncome: (incomeId: string) => Promise<void>;
  onSignOut: () => Promise<void>;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
};

const EXPENSE_TYPE_OPTIONS: ExpenseType[] = [
  'comida',
  'deudas',
  'futbol',
  'medicina',
  'departamento',
  'servicios',
  'entretenimiento',
  'otros'
];

const EXPENSE_SCOPE_LABELS: Record<ExpenseScope, string> = {
  daily: 'Gasto diario',
  credit_card: 'Tarjeta de crédito'
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

  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('es-PE', {
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
  creditCardExpenses,
  creditCardPayments,
  creditLine,
  creditLineConfigured,
  incomes,
  onCreateExpense,
  onUpdateExpense,
  onDeleteExpense,
  onCreateCreditCardExpense,
  onUpdateCreditCardExpense,
  onDeleteCreditCardExpense,
  onSetInitialCreditLine,
  onCreateCreditCardPayment,
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
  const [editingCreditCardExpenseId, setEditingCreditCardExpenseId] = useState<string | null>(null);
  const [editingIncomeId, setEditingIncomeId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [expenseType, setExpenseType] = useState<ExpenseType>('otros');
  const [expenseScope, setExpenseScope] = useState<ExpenseScope>('daily');
  const [activeExpenseTab, setActiveExpenseTab] = useState<ExpenseScope>('daily');
  const [activeReportTab, setActiveReportTab] = useState<ExpenseScope>('daily');
  const [showCreditLineForm, setShowCreditLineForm] = useState(false);
  const [showCardPaymentForm, setShowCardPaymentForm] = useState(false);
  const [creditLineInput, setCreditLineInput] = useState('');
  const [cardPaymentAmount, setCardPaymentAmount] = useState('');
  const [cardPaymentDate, setCardPaymentDate] = useState(getTodayLocalDate());
  const [cardPaymentNote, setCardPaymentNote] = useState('');
  const [cardControlLoading, setCardControlLoading] = useState(false);
  const [date, setDate] = useState(getTodayLocalDate());
  const [reportDate, setReportDate] = useState(getTodayLocalDate());
  const [loading, setLoading] = useState(false);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);
  const [deletingCreditCardExpenseId, setDeletingCreditCardExpenseId] = useState<string | null>(null);
  const [deletingIncomeId, setDeletingIncomeId] = useState<string | null>(null);
  const [deleteModalData, setDeleteModalData] = useState<{
    id: string;
    title: string;
    type: 'expense' | 'credit_card_expense' | 'income';
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dailyExpenses = useMemo(() => expenses, [expenses]);
  const spending = useMemo(() => calcSpendingAverages(dailyExpenses), [dailyExpenses]);
  const visibleExpenses = activeExpenseTab === 'daily' ? dailyExpenses : creditCardExpenses;
  const totalIncome = useMemo(
    () => incomes.reduce((acc, income) => acc + Number(income.amount), 0),
    [incomes]
  );
  const currentBalance = totalIncome - spending.totalSpent;

  useEffect(() => {
    if (creditLineConfigured) {
      setShowCreditLineForm(false);
      setCreditLineInput(String(creditLine));
    }
  }, [creditLine, creditLineConfigured]);

  const report = useMemo(() => {
    const incomeUntilDate = sumAmountsByDate(incomes, reportDate);
    const creditCardPaymentsUntilDate = creditCardPayments
      .filter((payment) => payment.payment_date <= reportDate)
      .reduce((acc, payment) => acc + Number(payment.amount), 0);
    const creditCardIncomeUntilDate = creditLine + creditCardPaymentsUntilDate;
    const dailyExpenseUntilDate = sumAmountsByDate(dailyExpenses, reportDate);
    const creditCardExpenseUntilDate = sumAmountsByDate(creditCardExpenses, reportDate);
    return {
      incomeUntilDate,
      creditCardIncomeUntilDate,
      creditCardPaymentsUntilDate,
      dailyExpenseUntilDate,
      creditCardExpenseUntilDate,
      balanceUntilDate: incomeUntilDate - dailyExpenseUntilDate,
      balanceWithCreditCardUntilDate: creditCardIncomeUntilDate - creditCardExpenseUntilDate
    };
  }, [creditCardExpenses, creditCardPayments, creditLine, dailyExpenses, incomes, reportDate]);

  const handleSetInitialCreditLine = async () => {
    const parsed = Number(creditLineInput);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError('La línea de crédito debe ser mayor que 0');
      return;
    }

    setError(null);
    setCardControlLoading(true);
    try {
      await onSetInitialCreditLine(parsed);
      setShowCreditLineForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible registrar la línea de crédito inicial');
    } finally {
      setCardControlLoading(false);
    }
  };

  const handleCreateCardPayment = async () => {
    const parsed = Number(cardPaymentAmount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError('El pago de tarjeta debe ser mayor que 0');
      return;
    }

    if (!cardPaymentDate) {
      setError('La fecha del pago es obligatoria');
      return;
    }

    setError(null);
    setCardControlLoading(true);
    try {
      await onCreateCreditCardPayment({
        amount: parsed,
        payment_date: cardPaymentDate,
        note: cardPaymentNote
      });
      setCardPaymentAmount('');
      setCardPaymentDate(getTodayLocalDate());
      setCardPaymentNote('');
      setShowCardPaymentForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible registrar el pago de tarjeta');
    } finally {
      setCardControlLoading(false);
    }
  };

  const handleFieldFocus = (event: FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const element = event.currentTarget;
    window.setTimeout(() => {
      element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
    }, 180);
  };

  const resetForm = () => {
    setEditingExpenseId(null);
    setEditingCreditCardExpenseId(null);
    setEditingIncomeId(null);
    setTitle('');
    setAmount('');
    setDescription('');
    setExpenseType('otros');
    setExpenseScope('daily');
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
    setEditingCreditCardExpenseId(null);
    setEditingIncomeId(null);
    setTitle(expense.title);
    setAmount(String(expense.amount));
    setDescription(expense.description ?? '');
    setExpenseType(expense.expense_type ?? 'otros');
    setExpenseScope(expense.expense_scope ?? 'daily');
    setDate(expense.date);
    setError(null);
    setIsModalOpen(true);
  };

  const openEditCreditCardExpenseModal = (expense: CreditCardExpense) => {
    setEntryType('expense');
    setEditingCreditCardExpenseId(expense.id);
    setEditingExpenseId(null);
    setEditingIncomeId(null);
    setTitle(expense.title);
    setAmount(String(expense.amount));
    setDescription(expense.description ?? '');
    setExpenseType(expense.expense_type ?? 'otros');
    setExpenseScope('credit_card');
    setDate(expense.date);
    setError(null);
    setIsModalOpen(true);
  };

  const openEditIncomeModal = (income: Income) => {
    setEntryType('income');
    setEditingIncomeId(income.id);
    setEditingExpenseId(null);
    setEditingCreditCardExpenseId(null);
    setTitle(income.title);
    setAmount(String(income.amount));
    setDescription(income.description ?? '');
    setExpenseType('otros');
    setExpenseScope('daily');
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
      if (entryType === 'expense') {
        if (expenseScope === 'credit_card' && editingCreditCardExpenseId) {
          await onUpdateCreditCardExpense(editingCreditCardExpenseId, {
            title,
            amount: parsedAmount,
            description,
            date,
            expense_type: expenseType
          });
        } else if (expenseScope === 'credit_card') {
          await onCreateCreditCardExpense({
            title,
            amount: parsedAmount,
            description,
            date,
            expense_type: expenseType
          });
        } else if (editingExpenseId) {
          await onUpdateExpense(editingExpenseId, {
            title,
            amount: parsedAmount,
            description,
            date,
            expense_type: expenseType,
            expense_scope: 'daily'
          });
        } else {
          await onCreateExpense({
            title,
            amount: parsedAmount,
            description,
            date,
            expense_type: expenseType,
            expense_scope: 'daily'
          });
        }
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

  const openDeleteModal = (id: string, title: string, type: 'expense' | 'credit_card_expense' | 'income') => {
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
      } else if (deleteModalData.type === 'credit_card_expense') {
        setDeletingCreditCardExpenseId(deleteModalData.id);
        await onDeleteCreditCardExpense(deleteModalData.id);
        if (editingCreditCardExpenseId === deleteModalData.id) {
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
      setDeletingCreditCardExpenseId(null);
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
              <p className="text-xs text-slate-500 dark:text-slate-400">Separa el reporte entre gasto diario y tarjeta de crédito.</p>
              <div className="mt-2 inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveReportTab('daily')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition sm:text-sm ${
                    activeReportTab === 'daily'
                      ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100'
                  }`}
                >
                  Gasto diario
                </button>
                <button
                  type="button"
                  onClick={() => setActiveReportTab('credit_card')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition sm:text-sm ${
                    activeReportTab === 'credit_card'
                      ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100'
                  }`}
                >
                  Tarjeta de crédito
                </button>
              </div>
            </div>
            <div className="w-full sm:w-56">
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Fecha de corte</label>
              <input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} />
            </div>
          </div>

          {activeReportTab === 'credit_card' && (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                disabled={creditLineConfigured}
                onClick={() => {
                  setShowCreditLineForm((prev) => !prev);
                  setShowCardPaymentForm(false);
                }}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {creditLineConfigured ? 'Línea inicial registrada' : 'Registrar línea de crédito inicial'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowCardPaymentForm((prev) => !prev);
                  setShowCreditLineForm(false);
                }}
                className="rounded-lg border border-emerald-300 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
              >
                Registrar pago de tarjeta
              </button>
            </div>
          )}

          {activeReportTab === 'credit_card' && showCreditLineForm && !creditLineConfigured && (
            <div className="mt-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Monto inicial de línea de crédito</label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={creditLineInput}
                  onFocus={handleFieldFocus}
                  onChange={(e) => setCreditLineInput(e.target.value)}
                  placeholder="Ej: 5000"
                />
                <button
                  type="button"
                  disabled={cardControlLoading}
                  onClick={() => void handleSetInitialCreditLine()}
                  className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-70"
                >
                  {cardControlLoading ? 'Guardando...' : 'Guardar línea inicial'}
                </button>
              </div>
            </div>
          )}

          {activeReportTab === 'credit_card' && showCardPaymentForm && (
            <div className="mt-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <div className="grid gap-2 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Monto pagado</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={cardPaymentAmount}
                    onFocus={handleFieldFocus}
                    onChange={(e) => setCardPaymentAmount(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Fecha de pago</label>
                  <input
                    type="date"
                    value={cardPaymentDate}
                    onFocus={handleFieldFocus}
                    onChange={(e) => setCardPaymentDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Nota (opcional)</label>
                  <input
                    value={cardPaymentNote}
                    onFocus={handleFieldFocus}
                    onChange={(e) => setCardPaymentNote(e.target.value)}
                    placeholder="Ej: pago septiembre"
                  />
                </div>
              </div>
              <div className="mt-2">
                <button
                  type="button"
                  disabled={cardControlLoading}
                  onClick={() => void handleCreateCardPayment()}
                  className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-70"
                >
                  {cardControlLoading ? 'Guardando...' : 'Guardar pago'}
                </button>
              </div>
            </div>
          )}

          <div className="mt-3 grid gap-2 sm:mt-4 sm:grid-cols-3 sm:gap-3">
            <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/70 sm:rounded-xl sm:p-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {activeReportTab === 'daily' ? 'Ingresos acumulados' : 'Línea + pagos acumulados'}
              </p>
              <p className="mt-1 text-base font-semibold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(activeReportTab === 'daily' ? report.incomeUntilDate : report.creditCardIncomeUntilDate)}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/70 sm:rounded-xl sm:p-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {activeReportTab === 'daily' ? 'Gastos diarios acumulados' : 'Gastos tarjeta acumulados'}
              </p>
              <p className="mt-1 text-base font-semibold text-rose-600 dark:text-rose-400">
                {formatCurrency(
                  activeReportTab === 'daily' ? report.dailyExpenseUntilDate : report.creditCardExpenseUntilDate
                )}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/70 sm:rounded-xl sm:p-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {activeReportTab === 'daily' ? 'Saldo acumulado (sin tarjeta)' : 'Disponible de crédito acumulado'}
              </p>
              <p
                className={`mt-1 text-base font-semibold ${
                  (activeReportTab === 'daily' ? report.balanceUntilDate : report.balanceWithCreditCardUntilDate) >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {formatCurrency(
                  activeReportTab === 'daily' ? report.balanceUntilDate : report.balanceWithCreditCardUntilDate
                )}
              </p>
            </div>
            {activeReportTab === 'credit_card' && (
              <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/70 sm:rounded-xl sm:p-3 sm:col-span-3">
                <p className="text-xs text-slate-500 dark:text-slate-400">Pagos de tarjeta acumulados</p>
                <p className="mt-1 text-base font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(report.creditCardPaymentsUntilDate)}
                </p>
              </div>
            )}
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
            <div className="mt-3 inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setActiveExpenseTab('daily')}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition sm:text-sm ${
                  activeExpenseTab === 'daily'
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100'
                }`}
              >
                Gastos diarios ({dailyExpenses.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveExpenseTab('credit_card')}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition sm:text-sm ${
                  activeExpenseTab === 'credit_card'
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100'
                }`}
              >
                Tarjeta de crédito ({creditCardExpenses.length})
              </button>
            </div>
          </div>

          {visibleExpenses.length === 0 ? (
            <p className="p-4 text-sm text-slate-500 dark:text-slate-400">
              {activeExpenseTab === 'daily'
                ? 'Aún no hay gastos diarios registrados.'
                : 'Aún no hay gastos con tarjeta registrados.'}
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {visibleExpenses.map((expense) => (
                <li key={expense.id} className="flex flex-col gap-2 px-4 py-3 sm:gap-3">
                  <div>
                    <p className="break-words font-medium text-slate-900 dark:text-slate-100">{expense.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {formatDateOnly(expense.date)}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:border-slate-300/50 dark:bg-slate-100 dark:text-slate-900">
                        {expense.expense_type ?? 'otros'}
                      </span>
                      <span className="rounded-full border border-brand-200 bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700 dark:border-slate-300/50 dark:bg-slate-100 dark:text-slate-900">
                        {EXPENSE_SCOPE_LABELS[activeExpenseTab]}
                      </span>
                    </div>
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
                        onClick={() =>
                          activeExpenseTab === 'daily'
                            ? openEditExpenseModal(expense as Expense)
                            : openEditCreditCardExpenseModal(expense as CreditCardExpense)
                        }
                        className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        disabled={
                          activeExpenseTab === 'daily'
                            ? deletingExpenseId === expense.id
                            : deletingCreditCardExpenseId === expense.id
                        }
                        onClick={() =>
                          openDeleteModal(
                            expense.id,
                            expense.title,
                            activeExpenseTab === 'daily' ? 'expense' : 'credit_card_expense'
                          )
                        }
                        className="rounded-lg border border-rose-300 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-70 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950/30"
                      >
                        {(activeExpenseTab === 'daily'
                          ? deletingExpenseId === expense.id
                          : deletingCreditCardExpenseId === expense.id)
                          ? 'Eliminando...'
                          : 'Eliminar'}
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
                  ? editingExpenseId || editingCreditCardExpenseId
                    ? expenseScope === 'credit_card'
                      ? 'Editar gasto de tarjeta'
                      : 'Editar gasto'
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

              {entryType === 'expense' && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Tipo de gasto</label>
                    <select
                      value={expenseType}
                      onFocus={handleFieldFocus}
                      onChange={(e) => setExpenseType(e.target.value as ExpenseType)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    >
                      {EXPENSE_TYPE_OPTIONS.map((type) => (
                        <option key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Apartado</label>
                    <select
                      value={expenseScope}
                      onFocus={handleFieldFocus}
                      onChange={(e) => setExpenseScope(e.target.value as ExpenseScope)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    >
                      <option value="daily">Gasto común diario</option>
                      <option value="credit_card">Tarjeta de crédito</option>
                    </select>
                  </div>
                </div>
              )}

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
                    ? editingExpenseId || editingCreditCardExpenseId
                      ? 'bg-amber-500 hover:bg-amber-600'
                      : 'bg-brand-500 hover:bg-brand-600'
                    : 'bg-emerald-500 hover:bg-emerald-600'
                }`}
              >
                {loading
                  ? 'Guardando...'
                  : entryType === 'expense'
                    ? editingExpenseId || editingCreditCardExpenseId
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
              ¿Seguro que quieres eliminar {deleteModalData.type === 'income' ? 'el ingreso' : 'el gasto'} "
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
                disabled={Boolean(deletingExpenseId || deletingCreditCardExpenseId || deletingIncomeId)}
                onClick={() => void handleDeleteConfirmed()}
                className="rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-70"
              >
                {deletingExpenseId || deletingCreditCardExpenseId || deletingIncomeId ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
