-- TP5: registros y pagos exclusivamente ilustrativos.
create table public.stations (
  id uuid primary key default gen_random_uuid(), name text not null, address text not null,
  lat double precision not null check(lat between -90 and 90), lng double precision not null check(lng between -180 and 180),
  bikes integer not null check(bikes >= 0), docks integer not null check(docks >= 0), updated_at timestamptz not null default now()
);
create table public.alarms (
  id uuid primary key default gen_random_uuid(), name text not null, zone text not null,
  lat double precision not null check(lat between -90 and 90), lng double precision not null check(lng between -180 and 180),
  active boolean not null default false, updated_at timestamptz not null default now()
);
create table public.zones (
  id uuid primary key default gen_random_uuid(), name text not null, hourly_rate numeric(12,2) not null check(hourly_rate > 0),
  hours text not null, lat double precision not null, lng double precision not null, radius integer not null check(radius > 0)
);
create table public.contacts (
  id uuid primary key default gen_random_uuid(), name text not null, description text not null,
  hours text not null, phone text, email text, whatsapp text
);
create table public.bills (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  concept text not null, period text not null, amount numeric(12,2) not null check(amount > 0), due_date date not null,
  status text not null default 'pending' check(status in ('pending','paid')), unique(user_id,concept,period)
);
create table public.payments (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  bill_id uuid unique references public.bills(id), amount numeric(12,2) not null check(amount > 0),
  description text not null, created_at timestamptz not null default now(),
  reference text not null default ('DEMO-' || gen_random_uuid()::text), simulated boolean not null default true check(simulated)
);
create table public.claims (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check(category in ('Alumbrado','Limpieza','Calles y veredas','Espacios verdes','Otros')),
  description text not null check(length(trim(description)) between 10 and 2000),
  address text not null check(length(trim(address)) between 5 and 200),
  status text not null default 'recibido' check(status in ('recibido','en curso','resuelto')),
  attachments jsonb not null default '[]' check(jsonb_typeof(attachments) = 'array' and jsonb_array_length(attachments) <= 3),
  events jsonb not null default '[]', created_at timestamptz not null default now()
);
create table public.bike_reports (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  station_id uuid not null references public.stations(id), description text not null check(length(trim(description)) between 10 and 2000),
  created_at timestamptz not null default now()
);
create table public.preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  settings jsonb not null default '{"categories":["servicios","obras","eventos","alarmas","tributos","estacionamiento","reclamos"],"zones":["Centro"],"frequency":"immediate","nearby_km":2,"location":null}'::jsonb,
  constraint valid_frequency check(settings->>'frequency' in ('immediate','daily','off')),
  constraint valid_categories check(jsonb_typeof(settings->'categories') = 'array' and jsonb_array_length(settings->'categories') <= 7 and (settings->'categories') <@ '["servicios","obras","eventos","alarmas","tributos","estacionamiento","reclamos"]'::jsonb),
  constraint valid_zones check(jsonb_typeof(settings->'zones') = 'array' and jsonb_array_length(settings->'zones') <= 20),
  constraint valid_radius check((settings->>'nearby_km')::numeric in (1,2,5)),
  constraint valid_location check(settings->'location' = 'null'::jsonb or (jsonb_typeof(settings->'location') = 'object' and (settings->'location'->>'lat')::numeric between -90 and 90 and (settings->'location'->>'lng')::numeric between -180 and 180)),
  constraint required_preferences check(settings ?& array['categories','zones','frequency','nearby_km','location']),
  constraint no_null_preferences check(
    jsonb_typeof(settings->'categories') = 'array' and jsonb_typeof(settings->'zones') = 'array' and
    jsonb_typeof(settings->'frequency') = 'string' and jsonb_typeof(settings->'nearby_km') = 'number' and
    (settings->'location' = 'null'::jsonb or coalesce((settings->'location' ?& array['lat','lng']) and jsonb_typeof(settings->'location'->'lat') = 'number' and jsonb_typeof(settings->'location'->'lng') = 'number',false))
  )
);
create table public.notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  title text not null, body text not null, category text not null check(category in ('servicios','obras','eventos','alarmas','tributos','estacionamiento','reclamos')),
  zone text, link text not null check(link like '/%' and link not like '//%'), read boolean not null default false,
  created_at timestamptz not null default now(), visible_at timestamptz not null default now(), pushed_at timestamptz,
  dedupe_key text, unique(user_id,dedupe_key)
);
create table public.parking (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  zone_id uuid not null references public.zones(id), plate text not null check(plate ~ '^([A-Z]{3}[0-9]{3}|[A-Z]{2}[0-9]{3}[A-Z]{2}|[A-Z][0-9]{3}[A-Z]{3}|[0-9]{3}[A-Z]{3})$'),
  starts_at timestamptz not null default now(), ends_at timestamptz not null, amount numeric(12,2) not null check(amount > 0),
  status text not null default 'active' check(status in ('active','finished')), check(ends_at > starts_at)
);
create unique index one_active_parking_per_citizen on public.parking(user_id) where status = 'active';
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique check(length(endpoint) < 4096 and endpoint like 'https://%'), subscription jsonb not null,
  created_at timestamptz not null default now(), check(subscription->>'endpoint' = endpoint)
);
create table public.push_deliveries (
  notification_id uuid not null references public.notifications(id) on delete cascade,
  subscription_id uuid not null references public.push_subscriptions(id) on delete cascade,
  sent_at timestamptz not null default now(), primary key(notification_id,subscription_id)
);

-- Quitar los privilegios heredados del esquema público; conceder solo lo necesario.
do $$ declare t text; begin
  foreach t in array array['stations','alarms','zones','contacts','bills','payments','claims','bike_reports','preferences','notifications','parking','push_subscriptions','push_deliveries'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon, authenticated',t);
    execute format('grant all on public.%I to service_role',t);
    if t <> 'push_deliveries' then execute format('grant select on public.%I to authenticated',t); end if;
  end loop;
  foreach t in array array['stations','alarms','zones','contacts'] loop
    execute format('create policy read_directory on public.%I for select to authenticated using (true)',t);
  end loop;
  foreach t in array array['bills','payments','claims','bike_reports','preferences','notifications','parking','push_subscriptions'] loop
    execute format('create policy own_records on public.%I for select to authenticated using (user_id = (select auth.uid()))',t);
    if t <> 'preferences' then execute format('create index on public.%I(user_id)',t); end if;
  end loop;
end $$;
grant insert(user_id,category,description,address,attachments) on public.claims to authenticated;
grant insert(user_id,station_id,description) on public.bike_reports to authenticated;
grant update(settings) on public.preferences to authenticated;
grant insert(user_id,endpoint,subscription), update(subscription,user_id), delete on public.push_subscriptions to authenticated;
create policy create_claim on public.claims for insert to authenticated with check(
  user_id = (select auth.uid()) and not exists (
    select 1 from jsonb_array_elements(attachments) a where
      not (a ?& array['path','name','type','size']) or
      (a->>'path') not like ((select auth.uid())::text || '/%') or
      (a->>'type') not in ('image/jpeg','image/png','image/webp','application/pdf') or
      (a->>'size')::bigint not between 1 and 5242880
  )
);
create policy create_bike_report on public.bike_reports for insert to authenticated with check(user_id = (select auth.uid()));
create policy edit_preferences on public.preferences for update to authenticated using(user_id = (select auth.uid())) with check(user_id = (select auth.uid()));
create policy create_push on public.push_subscriptions for insert to authenticated with check(user_id = (select auth.uid()));
create policy edit_push on public.push_subscriptions for update to authenticated using(user_id = (select auth.uid())) with check(user_id = (select auth.uid()));
create policy delete_push on public.push_subscriptions for delete to authenticated using(user_id = (select auth.uid()));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('claim-attachments','claim-attachments',false,5242880,array['image/jpeg','image/png','image/webp','application/pdf']) on conflict(id) do nothing;
create policy own_upload on storage.objects for insert to authenticated with check(bucket_id = 'claim-attachments' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy own_download on storage.objects for select to authenticated using(bucket_id = 'claim-attachments' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy own_delete_upload on storage.objects for delete to authenticated using(bucket_id = 'claim-attachments' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Función interna: aplica preferencias antes de crear cada aviso, también para push.
create function public.enqueue_notice(recipient uuid, heading text, content text, topic text, href text, area text default null, dedupe text default null)
returns void language plpgsql security definer set search_path = public as $$
declare p jsonb; deliver_at timestamptz;
begin
  select settings into p from preferences where user_id = recipient;
  if p is null or p->>'frequency' = 'off' or not (p->'categories' ? topic) then return; end if;
  if area is not null and not (p->'zones' ? area) then return; end if;
  deliver_at := now() + case when p->>'frequency' = 'daily' then interval '24 hours' else interval '0' end;
  insert into notifications(user_id,title,body,category,link,zone,visible_at,dedupe_key)
    values(recipient,heading,content,topic,href,area,deliver_at,dedupe) on conflict(user_id,dedupe_key) do nothing;
end $$;
revoke all on function public.enqueue_notice(uuid,text,text,text,text,text,text) from public,anon,authenticated;

create function public.bootstrap_citizen(citizen uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  insert into preferences(user_id) values(citizen) on conflict do nothing;
  insert into bills(user_id,concept,period,amount,due_date) values
    (citizen,'Tasa de servicios a la propiedad','Noviembre 2026',12400,current_date + 3),
    (citizen,'Contribución sobre automotores','Cuota 5 · 2026',18700,current_date + 3) on conflict do nothing;
  perform enqueue_notice(citizen,'Bienvenido a tu ciudad conectada','Datos y pagos de demostración del TP5. No hay conexión con servicios municipales oficiales.','eventos','/',null,'welcome');
end $$;
revoke all on function public.bootstrap_citizen(uuid) from public,anon,authenticated;
create function public.on_citizen_created() returns trigger language plpgsql security definer set search_path = public as $$ begin perform bootstrap_citizen(new.id); return new; end $$;
revoke all on function public.on_citizen_created() from public,anon,authenticated;
create trigger create_citizen after insert on auth.users for each row execute function public.on_citizen_created();
-- También prepara cuentas que existían antes de aplicar la migración.
select public.bootstrap_citizen(id) from auth.users;

create function public.pay_bill_demo(bill uuid) returns void language plpgsql security definer set search_path = public as $$
declare b bills;
begin
  if auth.uid() is null then raise exception 'Iniciá sesión.'; end if;
  select * into b from bills where id = bill and user_id = auth.uid() for update;
  if not found or b.status <> 'pending' then raise exception 'El cedulón ya está pagado o no existe.'; end if;
  insert into payments(user_id,bill_id,amount,description) values(auth.uid(),b.id,b.amount,b.concept || ' · ' || b.period);
  update bills set status = 'paid' where id = b.id;
  perform enqueue_notice(auth.uid(),'Pago simulado registrado',b.concept,'tributos','/tributaria',null,'paid:' || b.id);
end $$;
create function public.start_parking_demo(zone uuid, vehicle text, minutes integer) returns void language plpgsql security definer set search_path = public as $$
declare z zones; total numeric;
begin
  if auth.uid() is null then raise exception 'Iniciá sesión.'; end if;
  if minutes not between 15 and 240 then raise exception 'Elegí entre 15 y 240 minutos.'; end if;
  if vehicle is null or vehicle !~ '^([A-Z]{3}[0-9]{3}|[A-Z]{2}[0-9]{3}[A-Z]{2}|[A-Z][0-9]{3}[A-Z]{3}|[0-9]{3}[A-Z]{3})$' then raise exception 'Patente inválida.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
  update parking set status = 'finished' where user_id = auth.uid() and ends_at <= now() and status = 'active';
  if exists(select 1 from parking where user_id = auth.uid() and status = 'active') then raise exception 'Ya tenés un estacionamiento activo.'; end if;
  select * into z from zones where id = zone;
  if not found then raise exception 'Zona inexistente.'; end if;
  total := round(z.hourly_rate * minutes / 60,2);
  insert into parking(user_id,zone_id,plate,ends_at,amount) values(auth.uid(),z.id,vehicle,now() + minutes * interval '1 minute',total);
  insert into payments(user_id,amount,description) values(auth.uid(),total,'Estacionamiento ' || vehicle);
end $$;
create function public.extend_parking_demo(parking_id uuid, minutes integer) returns void language plpgsql security definer set search_path = public as $$
declare p parking; total numeric; rate numeric;
begin
  if auth.uid() is null then raise exception 'Iniciá sesión.'; end if;
  if minutes not between 15 and 240 then raise exception 'Elegí entre 15 y 240 minutos.'; end if;
  select * into p from parking where id = parking_id and user_id = auth.uid() for update;
  if not found or p.status <> 'active' or p.ends_at <= now() then raise exception 'El estacionamiento ya finalizó.'; end if;
  if p.ends_at - p.starts_at + minutes * interval '1 minute' > interval '8 hours' then raise exception 'El máximo acumulado demo es 8 horas.'; end if;
  select hourly_rate into rate from zones where id = p.zone_id; total := round(rate * minutes / 60,2);
  update parking set ends_at = ends_at + minutes * interval '1 minute', amount = amount + total where id = p.id;
  insert into payments(user_id,amount,description) values(auth.uid(),total,'Extensión ' || p.plate);
end $$;
create function public.finish_parking(parking_id uuid) returns void language plpgsql security definer set search_path = public as $$
begin update parking set status = 'finished' where id = parking_id and user_id = auth.uid(); if not found then raise exception 'Sesión inexistente.'; end if; end $$;
create function public.read_notice(notice uuid) returns void language plpgsql security definer set search_path = public as $$
begin update notifications set read = true where id = notice and user_id = auth.uid(); if not found then raise exception 'Aviso inexistente.'; end if; end $$;

create function public.claim_tracking() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.status := 'recibido'; new.created_at := now();
    new.events := jsonb_build_array(jsonb_build_object('status','recibido','detail','Reclamo recibido. Conservá el número de seguimiento.','at',now()));
    perform enqueue_notice(new.user_id,'Recibimos tu reclamo',new.description,'reclamos','/reclamos');
  elsif new.status <> old.status then
    new.events := old.events || jsonb_build_array(jsonb_build_object('status',new.status,'detail','Estado actualizado por el operador.','at',now()));
    perform enqueue_notice(new.user_id,'Tu reclamo cambió de estado',new.category || ': ' || new.status,'reclamos','/reclamos');
  end if;
  return new;
end $$;
revoke all on function public.claim_tracking() from public,anon,authenticated;
create trigger track_claim before insert or update on claims for each row execute function public.claim_tracking();

create function public.alarm_notifications() returns trigger language plpgsql security definer set search_path = public as $$
declare p preferences; near_by boolean; loc jsonb; distance numeric;
begin
  new.updated_at := now();
  if new.active and not old.active then
    for p in select * from preferences loop
      loc := p.settings->'location'; near_by := false;
      if loc is not null and loc <> 'null'::jsonb then
        distance := 6371 * 2 * asin(sqrt(least(1.0,
          power(sin(radians(new.lat - (loc->>'lat')::double precision) / 2), 2) +
          cos(radians(new.lat)) * cos(radians((loc->>'lat')::double precision)) *
          power(sin(radians(new.lng - (loc->>'lng')::double precision) / 2), 2)
        )));
        near_by := distance <= (p.settings->>'nearby_km')::numeric;
      end if;
      perform enqueue_notice(p.user_id,'Alarma activada · Simulación',new.name || ', zona ' || new.zone || '.','alarmas','/alarmas',case when near_by then null else new.zone end);
    end loop;
  end if;
  return new;
end $$;
revoke all on function public.alarm_notifications() from public,anon,authenticated;
create trigger alarm_alert before update on alarms for each row execute function public.alarm_notifications();

create function public.check_user_reminders(citizen uuid) returns void language plpgsql security definer set search_path = public as $$
declare b bills; p parking; until_end interval;
begin
  for b in select * from bills where user_id = citizen and status = 'pending' and due_date <= current_date + 7 loop
    perform enqueue_notice(citizen,'Recordatorio de vencimiento',b.concept || ': vence el ' || b.due_date,'tributos','/tributaria',null,'bill:' || b.id);
  end loop;
  for p in select * from parking where user_id = citizen and status = 'active' and ends_at <= now() + interval '5 minutes' for update skip locked loop
    until_end := p.ends_at - now();
    perform enqueue_notice(citizen,case when until_end > interval '0' then 'Tu estacionamiento está por vencer' else 'Finalizó tu estacionamiento' end,p.plate,'estacionamiento','/estacionamiento',null,'parking:' || p.id || ':' || p.ends_at || ':' || case when until_end > interval '0' then 'soon' else 'end' end);
    if until_end <= interval '0' then update parking set status = 'finished' where id = p.id; end if;
  end loop;
end $$;
revoke all on function public.check_user_reminders(uuid) from public,anon,authenticated;
create function public.check_reminders() returns void language plpgsql security definer set search_path = public as $$ begin if auth.uid() is null then raise exception 'Iniciá sesión.'; end if; perform check_user_reminders(auth.uid()); end $$;
create function public.run_reminders() returns void language plpgsql security definer set search_path = public as $$ declare u record; begin for u in select user_id from preferences loop perform check_user_reminders(u.user_id); end loop; end $$;
revoke all on function public.run_reminders() from public,anon,authenticated;
grant execute on function public.run_reminders() to service_role;
do $$ declare f record; begin
  for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('pay_bill_demo','start_parking_demo','extend_parking_demo','finish_parking','read_notice','check_reminders') loop
    execute format('revoke all on function %s from public,anon',f.signature);
    execute format('grant execute on function %s to authenticated',f.signature);
  end loop;
end $$;
-- Realtime respeta las políticas SELECT de cada tabla.
do $$ declare t text; begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') then
    foreach t in array array['stations','alarms','zones','contacts','bills','payments','claims','bike_reports','preferences','notifications','parking'] loop
      execute format('alter publication supabase_realtime add table public.%I',t);
    end loop;
  end if;
end $$;
