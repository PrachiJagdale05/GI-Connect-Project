-- Orders table
create table if not exists orders (
  id uuid default gen_random_uuid() primary key,
  vendor_id text not null,
  product_id uuid not null,
  amount numeric not null,
  quantity int not null,
  status text default 'pending',
  created_at timestamp with time zone default now()
);

-- Products table
create table if not exists products (
  id uuid default gen_random_uuid() primary key,
  vendor_id text not null,
  name text not null,
  price numeric not null,
  stock int not null,
  created_at timestamp with time zone default now()
);

-- Example: for analytics, you might want an events table
create table if not exists analytics_events (
  id uuid default gen_random_uuid() primary key,
  vendor_id text not null,
  event_type text not null, -- e.g. "order_created", "product_added"
  amount numeric,
  created_at timestamp with time zone default now()
);
