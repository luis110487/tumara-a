-- Reviews table
create table if not exists public.reviews (
  id bigint generated always as identity primary key,
  request_id bigint not null unique references public.service_requests(id) on delete cascade,
  professional_id bigint not null references public.professionals(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

create index if not exists idx_reviews_professional on public.reviews(professional_id);

alter table public.reviews enable row level security;

drop policy if exists reviews_public_read on public.reviews;
create policy reviews_public_read on public.reviews for select using (true);

drop policy if exists reviews_customer_insert on public.reviews;
create policy reviews_customer_insert on public.reviews for insert to authenticated with check (
  customer_id = auth.uid()
  and exists (
    select 1 from public.service_requests r
    where r.id = request_id and r.customer_id = auth.uid() and r.status = 'completed'
  )
);

-- Keep professionals.rating / total_reviews in sync automatically
create or replace function public.update_professional_rating() returns trigger
language plpgsql security definer set search_path=public as $$
declare pid bigint;
begin
  pid := coalesce(new.professional_id, old.professional_id);
  update public.professionals p
  set rating = coalesce((select round(avg(rating)::numeric,2) from public.reviews where professional_id = pid), 0),
      total_reviews = (select count(*) from public.reviews where professional_id = pid)
  where p.id = pid;
  return coalesce(new, old);
end;
$$;

drop trigger if exists reviews_after_change on public.reviews;
create trigger reviews_after_change after insert or update or delete on public.reviews
for each row execute function public.update_professional_rating();
