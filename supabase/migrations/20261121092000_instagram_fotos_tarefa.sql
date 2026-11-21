-- Instagram de cada membro, fotografias carregadas no painel e tarefa periódica de pagamentos.

alter table public.team_members add column if not exists instagram text;

update public.team_members set instagram = 'armandogomes_oficial',
  bio = 'Consultor e treinador de vendas, autor e empreendedor. Fundador da Lucrus Escola de Vendas, actua na preparação de profissionais e equipas comerciais.'
  where name = 'Armando Gomes';
update public.team_members set instagram = 'miguelsimao_oficial',
  bio = 'Engenheiro de instrumentação e controlo de processos, treinador comportamental e escritor. Actua no desenvolvimento pessoal e na preparação para o mercado de trabalho.'
  where name = 'Miguel Simão';
update public.team_members set instagram = 'jkilla' where name = 'Jordão Neto';
update public.team_members set instagram = 'benvindo.magalhaes' where name = 'Benvindo Magalhães';
update public.team_members set instagram = 'jedsonbaltazar_mrgooo' where name = 'Jedson Baltazar';
update public.team_members set
  bio = 'Empresário e consultor de crescimento e estratégia empresarial. Fundador da D’Matos Capital e da Ngola Auto, e criador do projecto Além do Asfalto.'
  where name = 'Ariclenes de Matos';

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
          'photo_url', t.photo_url, 'instagram', t.instagram)
        else jsonb_build_object(
          'id', md5(t.id::text), 'is_revealed', false, 'silhouette_url', t.silhouette_url)
        end
        order by t.is_revealed desc,
                 case when t.is_revealed then t.sort_order else 0 end,
                 md5(t.id::text))
      from public.team_members t), '[]'::jsonb)
  );
$$;
revoke execute on function public.public_site() from public;
grant execute on function public.public_site() to anon, authenticated;

-- Fotografias carregadas no painel: nomes aleatórios, leitura pública, escrita só de administradores.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('equipa', 'equipa', true, 3145728, array['image/webp', 'image/png', 'image/jpeg'])
on conflict (id) do nothing;

create policy equipa_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'equipa' and (select public.is_admin()));
create policy equipa_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'equipa' and (select public.is_admin()));
create policy equipa_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'equipa' and (select public.is_admin()));

-- De 5 em 5 minutos: confirma pagamentos pendentes e liberta reservas fora de prazo.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'governa-te-reconcile',
  '*/5 * * * *',
  $job$
  select net.http_post(
    url := 'https://zryznrmlesjlgufqykye.supabase.co/functions/v1/api/reconcile',
    headers := jsonb_build_object('Content-Type', 'application/json',
                                  'x-cron-secret', private.get_secret('cron_secret')),
    body := '{}'::jsonb
  );
  $job$
);
