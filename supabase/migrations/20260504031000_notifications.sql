-- Create notifications table for system transmissions
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text not null,
  type text default 'system' not null,
  read boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table public.notifications enable row level security;

create policy "Users can view their own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Admins can insert notifications"
  on public.notifications for insert
  with check (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
      and role = 'admin'
    )
  );

create policy "Users can update their own notifications"
  on public.notifications for update
  using (auth.uid() = user_id);

-- Enable realtime
alter publication supabase_realtime add table public.notifications;
