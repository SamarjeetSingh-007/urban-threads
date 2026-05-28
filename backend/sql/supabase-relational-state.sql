-- Urban Threads relational user state schema for Supabase
-- Applies cart, wishlist, and catalog settings as SQL tables

create table if not exists public.catalog_settings (
  id smallint primary key default 1 check (id = 1),
  categories jsonb not null default '[]'::jsonb,
  sizes jsonb not null default '{"apparel": [], "footwear": []}'::jsonb,
  colors jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.user_cart_items (
  id bigserial primary key,
  user_id bigint not null references public.users(id) on delete cascade,
  product_id bigint not null,
  name text not null default '',
  price numeric(10,2) not null default 0,
  image text not null default '',
  size text not null default 'M',
  color text not null default 'Black',
  quantity integer not null default 1 check (quantity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, product_id, size, color)
);

create index if not exists idx_user_cart_items_user_id on public.user_cart_items(user_id);
create index if not exists idx_user_cart_items_product_id on public.user_cart_items(product_id);

create table if not exists public.user_wishlist_items (
  id bigserial primary key,
  user_id bigint not null references public.users(id) on delete cascade,
  product_id bigint not null,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create index if not exists idx_user_wishlist_items_user_id on public.user_wishlist_items(user_id);
create index if not exists idx_user_wishlist_items_product_id on public.user_wishlist_items(product_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_user_cart_items_updated_at on public.user_cart_items;
create trigger trg_user_cart_items_updated_at
before update on public.user_cart_items
for each row execute function public.set_updated_at();

alter table public.catalog_settings enable row level security;
alter table public.user_cart_items enable row level security;
alter table public.user_wishlist_items enable row level security;

revoke all on table public.catalog_settings from anon, authenticated;
revoke all on table public.user_cart_items from anon, authenticated;
revoke all on table public.user_wishlist_items from anon, authenticated;
