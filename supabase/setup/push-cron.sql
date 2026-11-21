-- Ejecutar desde SQL Editor como administrador después de preparar Vault.
-- Los nombres esperados son sf_push_url (URL completa) y sf_push_cron_secret.
create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
begin
  if (
    select count(*) from vault.decrypted_secrets
    where name in ('sf_push_url', 'sf_push_cron_secret')
  ) <> 2 then
    raise exception 'Configurá sf_push_url y sf_push_cron_secret en Vault.';
  end if;
end $$;

-- Volver a ejecutar el script ajusta la tarea con el mismo nombre.
select cron.schedule(
  'sf-conecta-send-push',
  '* * * * *',
  $job$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'sf_push_url'),
      body := '{}'::jsonb,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'sf_push_cron_secret')
      ),
      timeout_milliseconds := 20000
    );
  $job$
);
