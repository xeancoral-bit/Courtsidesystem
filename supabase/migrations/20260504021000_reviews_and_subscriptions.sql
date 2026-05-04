-- Create reviews table
create table if not exists public.reviews (
  id uuid default gen_random_uuid() primary key,
  facility_id uuid references public.facilities(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  rating integer check (rating >= 1 and rating <= 5) not null,
  comment text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table public.reviews enable row level security;

create policy "Reviews are viewable by everyone"
  on public.reviews for select
  using (true);

create policy "Users can insert their own reviews"
  on public.reviews for insert
  with check (auth.uid() = user_id);
