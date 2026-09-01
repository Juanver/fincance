# Finance Dashboard

Aplicación web de control de finanzas personales con React + Vite + TypeScript + Tailwind + Supabase.

## Requisitos

- Node.js 20+
- pnpm 9+

## Ejecutar local

1. Instala dependencias:

   ```bash
   pnpm install
   ```

2. Crea variables de entorno (obligatorio):

   ```bash
   cp .env.example .env
   ```

   Completa en `.env`:

   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

   > Sin estas variables, la app no podrá autenticar ni guardar gastos.

3. Inicia:

   ```bash
   pnpm dev
   ```

## Deploy en Vercel

1. Importa el repositorio en Vercel.
2. Framework preset: **Vite**.
3. Build command: `pnpm build`.
4. Output directory: `dist`.
5. Configura variables de entorno de Supabase en Vercel (mismos nombres).

El archivo `vercel.json` ya incluye rewrite para SPA.

## Integración completa con Supabase (lo que necesitamos)

1. Crear proyecto en Supabase.
2. Activar Auth por Email/Password en **Authentication > Providers > Email**.
3. Crear tablas `expenses` e `incomes`.
4. Activar RLS y políticas por usuario.
5. Configurar variables de entorno en local y en Vercel.

### 1) Variables de entorno

En `.env` (local):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

En Vercel (Project Settings > Environment Variables), agregar las mismas dos.

> Estas variables son obligatorias en local y en producción.

### 2) SQL recomendado (tablas + RLS)

```sql
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
   user_id uuid not null,
  title text not null,
  amount numeric not null,
  description text,
  date date not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.incomes (
   id uuid primary key default gen_random_uuid(),
   user_id uuid not null,
   title text not null,
   amount numeric not null,
   description text,
   date date not null default now(),
   created_at timestamptz not null default now()
);

alter table public.expenses enable row level security;
alter table public.incomes enable row level security;

create policy "read own expenses"
on public.expenses
for select
to authenticated
using (auth.uid() = user_id);

create policy "insert own expenses"
on public.expenses
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "update own expenses"
on public.expenses
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "delete own expenses"
on public.expenses
for delete
to authenticated
using (auth.uid() = user_id);

create policy "read own incomes"
on public.incomes
for select
to authenticated
using (auth.uid() = user_id);

create policy "insert own incomes"
on public.incomes
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "update own incomes"
on public.incomes
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "delete own incomes"
on public.incomes
for delete
to authenticated
using (auth.uid() = user_id);
```

### 3) Confirmación rápida

- Si no hay variables correctas, verás error de configuración en la pantalla de autenticación.
- Si están bien, podrás crear cuenta e iniciar sesión con Supabase.
