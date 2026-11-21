-- PostgREST incluye endpoint al actualizar por conflicto, incluso si conserva el valor.
-- Las políticas RLS siguen limitando la operación a suscripciones de la propia cuenta.
grant update(endpoint) on public.push_subscriptions to authenticated;
