-- GOVERNA-TE · base de dados
-- Catálogo (bilhetes, expositores, patrocinadores), pedidos, pagamentos AppyPay,
-- bilhetes com código, equipa com revelação progressiva e administradores.
--
-- Regras:
--  · O público só lê por `public_site()`; as tabelas não têm leitura anónima.
--  · Só o servidor (service_role) cria pedidos, regista pagamentos e emite bilhetes.
--  · Os administradores são os utilizadores listados em `admins`.

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- ---------------------------------------------------------------- utilitários

create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------- administradores

create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  name text,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins a where a.user_id = (select auth.uid()));
$$;

create policy admins_select on public.admins for select to authenticated
  using ((select public.is_admin()));
create policy admins_delete on public.admins for delete to authenticated
  using ((select public.is_admin()) and user_id <> (select auth.uid()));

-- Convites: o código só existe na ligação entregue à pessoa; aqui fica o resumo.
create table public.admin_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text,
  code_hash text not null unique,
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_at timestamptz,
  created_by text,
  created_at timestamptz not null default now()
);
alter table public.admin_invites enable row level security;
create policy admin_invites_select on public.admin_invites for select to authenticated
  using ((select public.is_admin()));
create policy admin_invites_delete on public.admin_invites for delete to authenticated
  using ((select public.is_admin()));

create or replace function public.admin_create_invite(p_email text, p_name text default null)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_code text := encode(extensions.gen_random_bytes(18), 'hex');
  v_email text := lower(trim(coalesce(p_email, '')));
begin
  if not public.is_admin() then raise exception 'Sem permissão'; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Email inválido'; end if;
  delete from public.admin_invites where email = v_email and used_at is null;
  insert into public.admin_invites (email, name, code_hash, created_by)
  values (v_email, nullif(trim(coalesce(p_name, '')), ''),
          encode(extensions.digest(v_code, 'sha256'), 'hex'),
          (select auth.jwt() ->> 'email'));
  return v_code;
end $$;

-- ------------------------------------------------------------- definições

create table public.event_settings (
  id boolean primary key default true check (id),
  event_name text not null default 'GOVERNA-TE',
  edition text not null default 'Edição 2027',
  event_date date,
  start_time time,
  end_time time,
  venue text default 'Palácio da Justiça',
  city text default 'Luanda',
  venue_confirmed boolean not null default false,
  capacity int default 660,
  sales_open boolean not null default false,
  contact_phone text,
  contact_whatsapp text,
  contact_email text,
  instagram_url text default 'https://www.instagram.com/governa_te',
  site_url text,
  reference_hours int not null default 48 check (reference_hours between 1 and 720),
  updated_at timestamptz not null default now()
);
alter table public.event_settings enable row level security;
create policy event_settings_admin_select on public.event_settings for select to authenticated
  using ((select public.is_admin()));
create policy event_settings_admin_update on public.event_settings for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create trigger event_settings_touch before update on public.event_settings
  for each row execute function public.touch_updated_at();
insert into public.event_settings (id) values (true);

-- ---------------------------------------------------------------- catálogo

create type public.product_kind as enum ('ticket', 'exhibitor', 'sponsor');

create table public.products (
  id uuid primary key default gen_random_uuid(),
  kind public.product_kind not null,
  name text not null,
  tagline text,
  description text,
  benefits text[] not null default '{}',
  price numeric(14, 2) check (price is null or price > 0),
  on_request boolean not null default false,
  stock int check (stock is null or stock >= 0),
  max_per_order int not null default 10 check (max_per_order between 1 and 100),
  tickets_per_unit int not null default 0 check (tickets_per_unit between 0 and 100),
  is_published boolean not null default false,
  is_featured boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.products enable row level security;
create policy products_admin_all on public.products for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------------ equipa

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null,
  bio text,
  section_label text,
  topic_title text,
  topic_description text,
  takeaway text,
  photo_url text,
  silhouette_url text,
  is_revealed boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.team_members enable row level security;
create policy team_admin_all on public.team_members for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create trigger team_touch before update on public.team_members
  for each row execute function public.touch_updated_at();

-- ----------------------------------------------------------------- pedidos

create type public.order_status as enum
  ('awaiting_payment', 'processing', 'paid', 'expired', 'cancelled');

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity (start with 1001),
  public_token text not null unique default encode(extensions.gen_random_bytes(16), 'hex'),
  kind public.product_kind not null,
  product_id uuid references public.products (id) on delete set null,
  product_name text not null,
  description text,
  quantity int not null default 1 check (quantity > 0),
  unit_price numeric(14, 2) not null check (unit_price > 0),
  amount numeric(14, 2) not null check (amount > 0),
  tickets_per_unit int not null default 0,
  buyer_name text not null,
  buyer_email text not null,
  buyer_phone text not null,
  company_name text,
  nif text,
  notes text,
  status public.order_status not null default 'awaiting_payment',
  payment_method text check (payment_method in ('express', 'referencia', 'manual')),
  appypay_entity text,
  appypay_reference text,
  reference_due_at timestamptz,
  failure_reason text,
  paid_at timestamptz,
  paid_by text,
  expires_at timestamptz,
  last_checked_at timestamptz,
  utm jsonb,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_status_idx on public.orders (status, created_at desc);
create index orders_product_idx on public.orders (product_id);
create index orders_email_idx on public.orders (lower(buyer_email));
alter table public.orders enable row level security;
create policy orders_admin_select on public.orders for select to authenticated
  using ((select public.is_admin()));
create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();

-- Cada tentativa de pagamento tem o seu merchantTransactionId na AppyPay.
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  merchant_transaction_id text not null unique,
  method text not null check (method in ('express', 'referencia')),
  amount numeric(14, 2) not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'expired')),
  appypay_transaction_id text,
  entity text,
  reference text,
  due_at timestamptz,
  message text,
  response jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payments_order_idx on public.payments (order_id, created_at desc);
create index payments_pending_idx on public.payments (status, created_at) where status = 'pending';
alter table public.payments enable row level security;
create policy payments_admin_select on public.payments for select to authenticated
  using ((select public.is_admin()));
create trigger payments_touch before update on public.payments
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- bilhetes

create or replace function public.gen_ticket_code() returns text
language plpgsql volatile set search_path = '' as $$
declare
  v_alphabet constant text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  v_bytes bytea := extensions.gen_random_bytes(8);
  v_out text := 'GT-';
begin
  for i in 0..7 loop
    v_out := v_out || substr(v_alphabet, (get_byte(v_bytes, i) % 32) + 1, 1);
    if i = 3 then v_out := v_out || '-'; end if;
  end loop;
  return v_out;
end $$;

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default public.gen_ticket_code(),
  public_token text not null unique default encode(extensions.gen_random_bytes(16), 'hex'),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_name text not null,
  seq int not null,
  holder_name text not null,
  holder_email text,
  holder_phone text,
  status text not null default 'valid' check (status in ('valid', 'used', 'cancelled')),
  checked_in_at timestamptz,
  checked_in_by text,
  created_at timestamptz not null default now(),
  unique (order_id, seq)
);
create index tickets_order_idx on public.tickets (order_id);
alter table public.tickets enable row level security;
create policy tickets_admin_select on public.tickets for select to authenticated
  using ((select public.is_admin()));

-- ---------------------------------------------------------------- contactos

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('waitlist', 'exhibitor', 'sponsor', 'contact')),
  product_id uuid references public.products (id) on delete set null,
  product_name text,
  name text not null,
  company text,
  email text,
  phone text,
  message text,
  status text not null default 'new' check (status in ('new', 'contacted', 'won', 'lost')),
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index leads_kind_idx on public.leads (kind, created_at desc);
alter table public.leads enable row level security;
create policy leads_admin_select on public.leads for select to authenticated
  using ((select public.is_admin()));
create policy leads_admin_update on public.leads for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy leads_admin_delete on public.leads for delete to authenticated
  using ((select public.is_admin()));
create trigger leads_touch before update on public.leads
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------- travão de pedidos públicos

create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits int not null default 1,
  primary key (key, window_start)
);
alter table public.rate_limits enable row level security;

-- Devolve true quando o pedido cabe no limite (e conta-o).
create or replace function public.rate_limit_hit(p_key text, p_limit int, p_window_seconds int)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits int;
begin
  insert into public.rate_limits (key, window_start) values (p_key, v_window)
  on conflict (key, window_start) do update set hits = public.rate_limits.hits + 1
  returning hits into v_hits;
  return v_hits <= p_limit;
end $$;

-- -------------------------------------------------------------- stock e site

-- Unidades ocupadas: pagas, ou reservadas por um pedido ainda dentro do prazo.
create or replace function public.product_reserved(p_product uuid) returns int
language sql stable security definer set search_path = '' as $$
  select coalesce(sum(o.quantity), 0)::int
  from public.orders o
  where o.product_id = p_product
    and (o.status = 'paid'
         or (o.status in ('awaiting_payment', 'processing')
             and (o.expires_at is null or o.expires_at > now())));
$$;

-- Tudo o que o site público mostra. Quem ainda não foi revelado sai só com a silhueta.
create or replace function public.public_site() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'settings', (
      select jsonb_build_object(
        'event_name', s.event_name, 'edition', s.edition, 'event_date', s.event_date,
        'start_time', s.start_time, 'end_time', s.end_time, 'venue', s.venue, 'city', s.city,
        'venue_confirmed', s.venue_confirmed, 'capacity', s.capacity, 'sales_open', s.sales_open,
        'contact_phone', s.contact_phone, 'contact_whatsapp', s.contact_whatsapp,
        'contact_email', s.contact_email, 'instagram_url', s.instagram_url)
      from public.event_settings s),
    'products', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'kind', p.kind, 'name', p.name, 'tagline', p.tagline,
        'description', p.description, 'benefits', to_jsonb(p.benefits), 'price', p.price,
        'on_request', p.on_request, 'max_per_order', p.max_per_order,
        'tickets_per_unit', p.tickets_per_unit, 'is_featured', p.is_featured,
        'remaining', case when p.stock is null then null
                          else greatest(p.stock - public.product_reserved(p.id), 0) end)
        order by p.sort_order, p.price nulls last, p.name)
      from public.products p where p.is_published), '[]'::jsonb),
    'team', coalesce((
      select jsonb_agg(
        case when t.is_revealed then jsonb_build_object(
          'id', t.id, 'is_revealed', true, 'name', t.name, 'role', t.role, 'bio', t.bio,
          'section_label', t.section_label, 'topic_title', t.topic_title,
          'topic_description', t.topic_description, 'takeaway', t.takeaway,
          'photo_url', t.photo_url)
        else jsonb_build_object(
          'id', md5(t.id::text), 'is_revealed', false, 'silhouette_url', t.silhouette_url)
        end
        order by t.is_revealed desc,
                 case when t.is_revealed then t.sort_order else 0 end,
                 md5(t.id::text))
      from public.team_members t), '[]'::jsonb)
  );
$$;

-- ---------------------------------------------- operações do servidor (edge)

-- Cria o pedido com o preço e o stock conferidos no servidor.
create or replace function public.service_create_order(
  p_product uuid, p_quantity int, p_name text, p_email text, p_phone text,
  p_company text default null, p_nif text default null, p_notes text default null,
  p_utm jsonb default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_p public.products;
  v_s public.event_settings;
  v_order public.orders;
begin
  select * into v_s from public.event_settings limit 1;
  if not coalesce(v_s.sales_open, false) then
    return jsonb_build_object('error', 'As vendas ainda não estão abertas.');
  end if;

  select * into v_p from public.products where id = p_product for update;
  if not found or not v_p.is_published then
    return jsonb_build_object('error', 'Produto não encontrado.');
  end if;
  if v_p.on_request or v_p.price is null then
    return jsonb_build_object('error', 'Este pacote é tratado por proposta. Use o formulário de contacto.');
  end if;
  if p_quantity is null or p_quantity < 1 or p_quantity > v_p.max_per_order then
    return jsonb_build_object('error', format('Quantidade inválida (máximo %s por pedido).', v_p.max_per_order));
  end if;
  if v_p.stock is not null and v_p.stock - public.product_reserved(v_p.id) < p_quantity then
    return jsonb_build_object('error', 'Já não há unidades suficientes disponíveis.');
  end if;

  insert into public.orders (kind, product_id, product_name, quantity, unit_price, amount,
    tickets_per_unit, buyer_name, buyer_email, buyer_phone, company_name, nif, notes, utm,
    status, expires_at)
  values (v_p.kind, v_p.id, v_p.name, p_quantity, v_p.price, v_p.price * p_quantity,
    v_p.tickets_per_unit, p_name, p_email, p_phone, p_company, p_nif, p_notes, p_utm,
    'awaiting_payment', now() + interval '30 minutes')
  returning * into v_order;

  return jsonb_build_object('order_id', v_order.id, 'token', v_order.public_token);
end $$;

-- Marca o pedido como pago uma só vez e emite os bilhetes.
create or replace function public.service_mark_order_paid(p_order uuid, p_by text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_o public.orders;
  v_total int;
begin
  update public.orders
     set status = 'paid', paid_at = now(), paid_by = p_by, failure_reason = null
   where id = p_order and status <> 'paid'
  returning * into v_o;
  if not found then return false; end if;

  v_total := coalesce(v_o.tickets_per_unit, 0) * v_o.quantity;
  for i in 1..v_total loop
    insert into public.tickets (order_id, product_id, product_name, seq, holder_name, holder_email, holder_phone)
    values (v_o.id, v_o.product_id, v_o.product_name, i, v_o.buyer_name, v_o.buyer_email, v_o.buyer_phone)
    on conflict (order_id, seq) do nothing;
  end loop;
  return true;
end $$;

create or replace function public.service_user_id_by_email(p_email text) returns uuid
language sql stable security definer set search_path = '' as $$
  select u.id from auth.users u where lower(u.email) = lower(p_email) limit 1;
$$;

-- ------------------------------------------------- segredos (Supabase Vault)

create or replace function private.set_secret(p_name text, p_value text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  select s.id into v_id from vault.secrets s where s.name = p_name;
  if p_value is null or btrim(p_value) = '' then
    if v_id is not null then delete from vault.secrets where id = v_id; end if;
    return;
  end if;
  if v_id is null then
    perform vault.create_secret(btrim(p_value), p_name);
  else
    perform vault.update_secret(v_id, btrim(p_value), p_name);
  end if;
end $$;

create or replace function private.get_secret(p_name text) returns text
language sql stable security definer set search_path = '' as $$
  select d.decrypted_secret from vault.decrypted_secrets d where d.name = p_name limit 1;
$$;

select private.set_secret('appypay_webhook_secret', encode(extensions.gen_random_bytes(24), 'hex'));
select private.set_secret('cron_secret', encode(extensions.gen_random_bytes(24), 'hex'));
select private.set_secret('appypay_api_url', 'https://gwy-api.appypay.co.ao');

-- Configuração completa, só para o servidor.
create or replace function public.service_get_config() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_object_agg(d.name, d.decrypted_secret), '{}'::jsonb)
  from vault.decrypted_secrets d
  where d.name in ('appypay_client_id', 'appypay_client_secret', 'appypay_resource',
                   'appypay_api_url', 'appypay_method_express', 'appypay_method_reference',
                   'appypay_webhook_secret', 'cron_secret', 'resend_api_key', 'email_from');
$$;

-- O painel grava as credenciais mas nunca as volta a ler: só sabe se estão preenchidas.
create or replace function public.admin_set_config(p_values jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_key text;
  v_allowed constant text[] := array['appypay_client_id', 'appypay_client_secret',
    'appypay_resource', 'appypay_api_url', 'appypay_method_express',
    'appypay_method_reference', 'resend_api_key', 'email_from'];
begin
  if not public.is_admin() then raise exception 'Sem permissão'; end if;
  for v_key in select jsonb_object_keys(p_values) loop
    if v_key = any (v_allowed) then
      perform private.set_secret(v_key, p_values ->> v_key);
    end if;
  end loop;
end $$;

create or replace function public.admin_config_status() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v jsonb;
begin
  if not public.is_admin() then raise exception 'Sem permissão'; end if;
  v := public.service_get_config();
  return jsonb_build_object(
    'appypay_client_id', coalesce(v ->> 'appypay_client_id', '') <> '',
    'appypay_client_secret', coalesce(v ->> 'appypay_client_secret', '') <> '',
    'appypay_resource', coalesce(v ->> 'appypay_resource', '') <> '',
    'appypay_api_url', v ->> 'appypay_api_url',
    'appypay_method_express', v ->> 'appypay_method_express',
    'appypay_method_reference', v ->> 'appypay_method_reference',
    'appypay_webhook_secret', v ->> 'appypay_webhook_secret',
    'resend_api_key', coalesce(v ->> 'resend_api_key', '') <> '',
    'email_from', v ->> 'email_from');
end $$;

-- ------------------------------------------------- operações do painel (RPC)

create or replace function public.admin_mark_order_paid(p_order uuid, p_note text default null)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_email text := (select auth.jwt() ->> 'email');
begin
  if not public.is_admin() then raise exception 'Sem permissão'; end if;
  update public.orders
     set payment_method = coalesce(payment_method, 'manual'),
         notes = case when nullif(btrim(coalesce(p_note, '')), '') is null then notes
                      else concat_ws(E'\n', notes, 'Pagamento confirmado à mão: ' || btrim(p_note)) end
   where id = p_order and status <> 'paid';
  return public.service_mark_order_paid(p_order, coalesce(v_email, 'admin'));
end $$;

create or replace function public.admin_cancel_order(p_order uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Sem permissão'; end if;
  update public.orders set status = 'cancelled'
   where id = p_order and status in ('awaiting_payment', 'processing', 'expired');
  return found;
end $$;

-- Cobrança à medida (por exemplo, um patrocínio negociado): devolve o código da ligação de pagamento.
create or replace function public.admin_create_charge(
  p_kind public.product_kind, p_description text, p_amount numeric,
  p_name text, p_email text, p_phone text, p_company text default null,
  p_nif text default null, p_tickets int default 0, p_valid_days int default 30
) returns text language plpgsql security definer set search_path = '' as $$
declare v_token text;
begin
  if not public.is_admin() then raise exception 'Sem permissão'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Valor inválido'; end if;
  if btrim(coalesce(p_description, '')) = '' or btrim(coalesce(p_name, '')) = '' then
    raise exception 'Descrição e nome são obrigatórios';
  end if;
  insert into public.orders (kind, product_name, description, quantity, unit_price, amount,
    tickets_per_unit, buyer_name, buyer_email, buyer_phone, company_name, nif, status,
    expires_at, created_by)
  values (p_kind, btrim(p_description), btrim(p_description), 1, p_amount, p_amount,
    greatest(coalesce(p_tickets, 0), 0), btrim(p_name), lower(btrim(coalesce(p_email, ''))),
    regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), nullif(btrim(coalesce(p_company, '')), ''),
    nullif(btrim(coalesce(p_nif, '')), ''), 'awaiting_payment',
    now() + make_interval(days => least(greatest(coalesce(p_valid_days, 30), 1), 180)),
    (select auth.jwt() ->> 'email'))
  returning public_token into v_token;
  return v_token;
end $$;

-- Validação à entrada: lê o código (ou o conteúdo do QR) e marca o bilhete como usado.
create or replace function public.admin_check_in(p_code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_code text := upper(btrim(coalesce(p_code, '')));
  v_t public.tickets;
  v_result text;
begin
  if not public.is_admin() then raise exception 'Sem permissão'; end if;
  -- O QR pode trazer uma ligação: fica só o código final.
  v_code := regexp_replace(v_code, '^.*(GT-[0-9A-Z]{4}-[0-9A-Z]{4}).*$', '\1');
  if v_code ~ '^GT[0-9A-Z]{8}$' then
    v_code := 'GT-' || substr(v_code, 3, 4) || '-' || substr(v_code, 7, 4);
  end if;

  select * into v_t from public.tickets where code = v_code for update;
  if not found then return jsonb_build_object('result', 'not_found', 'code', v_code); end if;

  if v_t.status = 'cancelled' then
    v_result := 'cancelled';
  elsif v_t.status = 'used' then
    v_result := 'already_used';
  else
    update public.tickets
       set status = 'used', checked_in_at = now(), checked_in_by = (select auth.jwt() ->> 'email')
     where id = v_t.id returning * into v_t;
    v_result := 'ok';
  end if;

  return jsonb_build_object('result', v_result, 'code', v_t.code, 'holder_name', v_t.holder_name,
    'product_name', v_t.product_name, 'checked_in_at', v_t.checked_in_at,
    'checked_in_by', v_t.checked_in_by, 'ticket_id', v_t.id);
end $$;

create or replace function public.admin_undo_check_in(p_ticket uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Sem permissão'; end if;
  update public.tickets set status = 'valid', checked_in_at = null, checked_in_by = null
   where id = p_ticket and status = 'used';
  return found;
end $$;

create or replace function public.admin_set_ticket(p_ticket uuid, p_holder text default null, p_cancel boolean default null)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Sem permissão'; end if;
  update public.tickets
     set holder_name = coalesce(nullif(btrim(coalesce(p_holder, '')), ''), holder_name),
         status = case when p_cancel is true and status = 'valid' then 'cancelled'
                       when p_cancel is false and status = 'cancelled' then 'valid'
                       else status end
   where id = p_ticket;
  return found;
end $$;

create or replace function public.admin_stats() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Sem permissão'; end if;
  return jsonb_build_object(
    'revenue', (select coalesce(sum(amount), 0) from public.orders where status = 'paid'),
    'revenue_by_kind', (select coalesce(jsonb_object_agg(kind, total), '{}'::jsonb) from (
        select kind, sum(amount) as total from public.orders where status = 'paid' group by kind) k),
    'orders_paid', (select count(*) from public.orders where status = 'paid'),
    'orders_open', (select count(*) from public.orders
        where status in ('awaiting_payment', 'processing') and (expires_at is null or expires_at > now())),
    'pending_amount', (select coalesce(sum(amount), 0) from public.orders
        where status = 'processing' and (expires_at is null or expires_at > now())),
    'tickets_issued', (select count(*) from public.tickets where status <> 'cancelled'),
    'tickets_used', (select count(*) from public.tickets where status = 'used'),
    'leads_new', (select count(*) from public.leads where status = 'new'),
    'capacity', (select capacity from public.event_settings),
    'products', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', p.id, 'kind', p.kind, 'name', p.name, 'stock', p.stock, 'is_published', p.is_published,
        'sold', (select coalesce(sum(o.quantity), 0) from public.orders o where o.product_id = p.id and o.status = 'paid'),
        'revenue', (select coalesce(sum(o.amount), 0) from public.orders o where o.product_id = p.id and o.status = 'paid'),
        'reserved', public.product_reserved(p.id)) order by p.kind, p.sort_order), '[]'::jsonb)
      from public.products p)
  );
end $$;

-- ----------------------------------------------------------------- permissões

revoke execute on all functions in schema public from public, anon;
revoke execute on function
  public.service_create_order(uuid, int, text, text, text, text, text, text, jsonb),
  public.service_mark_order_paid(uuid, text),
  public.service_user_id_by_email(text),
  public.service_get_config(),
  public.rate_limit_hit(text, int, int),
  public.product_reserved(uuid),
  public.gen_ticket_code(),
  public.touch_updated_at()
from authenticated;

grant execute on function public.public_site() to anon, authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function
  public.service_create_order(uuid, int, text, text, text, text, text, text, jsonb),
  public.service_mark_order_paid(uuid, text),
  public.service_user_id_by_email(text),
  public.service_get_config(),
  public.rate_limit_hit(text, int, int),
  public.product_reserved(uuid)
to service_role;

alter default privileges in schema public revoke execute on functions from public, anon;
