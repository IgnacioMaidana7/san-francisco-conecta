# Configuración de notificaciones push

La bandeja de avisos funciona sin push. El proyecto Supabase del TP5 tiene VAPID, la función `send-push` y un cron de un minuto. Para usarlo, compilá con `npm run build:conectado`, ejecutá `npm run preview` y activá push desde Notificaciones. Cada dispositivo necesita permiso del navegador. Para un teléfono físico, serví la app por HTTPS.

## Preparar las claves y el servidor en otro proyecto

1. Generar un par VAPID con una herramienta Web Push en una terminal privada:

```sh
npx web-push generate-vapid-keys
```

2. Guardar los secretos mediante el administrador de secretos de Supabase o su CLI. No versionarlos:

```dotenv
VAPID_PUBLIC_KEY=clave_publica_generada
VAPID_PRIVATE_KEY=clave_privada_generada
VAPID_SUBJECT=mailto:tu_correo_de_contacto
PUSH_CRON_SECRET=un_secreto_largo_y_aleatorio_exclusivo_del_programador
```

`SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` los proporciona el entorno de Edge Functions. Esta última clave nunca llega al navegador.

3. Desplegar desde la raíz del repositorio:

```sh
supabase functions deploy send-push
```

`supabase/config.toml` desactiva la verificación JWT para esta función porque el disparador utiliza `x-cron-secret`. La función rechaza toda petición sin ese secreto y solo admite POST. No es un endpoint público para enviar mensajes arbitrarios: consulta su propia cola en la base.

4. En `.env` del frontend agregar `VITE_VAPID_PUBLIC_KEY` con la misma clave **pública**, junto con el modo y las credenciales públicas de Supabase. Volver a compilar y publicar por HTTPS.
5. Abrir Notificaciones y tocar «Activar push». En iPhone se necesita instalar la PWA desde Safari y abrirla desde Inicio, en una versión que admita Web Push.

## Programar la entrega

El TP5 usa [Supabase Cron y Vault](https://supabase.com/docs/guides/functions/schedule-functions). Para reproducirlo:

1. Guardá en Vault `sf_push_url` con la URL completa de la función y `sf_push_cron_secret` con el mismo valor que tiene `PUSH_CRON_SECRET` en los secretos de Edge Functions.
2. Ejecutá `supabase/setup/push-cron.sql` en SQL Editor. Crea la tarea `sf-conecta-send-push` para llamar a la función una vez por minuto.

Si usás un programador propio, configurá la misma frecuencia sin ejecuciones superpuestas:

```http
POST https://TU_PROJECT_REF.supabase.co/functions/v1/send-push
x-cron-secret: EL_SECRETO_CONFIGURADO
```

Podés comprobar el envío desde el panel de Supabase Cron y los registros de la función. Las solicitudes sin el secreto reciben HTTP 401.

La función:

- Revisa vencimientos y estacionamientos aunque la PWA esté cerrada.
- Selecciona hasta 100 notificaciones entregables por ejecución.
- Revalida las categorías, zonas y pausas del usuario antes de enviar.
- Envía a sus dispositivos registrados con Web Push.
- Registra entregas por dispositivo para reducir duplicados en reintentos.
- Elimina endpoints expirados (404/410); reintenta fallos transitorios en otra ejecución.
- Rechaza dominios que no sean proveedores push conocidos para evitar enviar peticiones a servidores arbitrarios.

La entrega es «al menos una vez»: una caída entre el envío y el registro puede producir duplicados. Evitar ejecuciones simultáneas del cron. Antes de una operación de gran escala habría que incorporar bloqueos de trabajos, paginación/cupos y observabilidad.

## Preferencias y prueba

La frecuencia inmediata crea avisos visibles en el momento. «Resumen a las 24 horas» difiere cada aviso 24 h; no compacta varios eventos en un solo mensaje. «Pausar» deja de crear nuevos avisos y bloquea el envío pendiente. El historial ya recibido permanece disponible.

Para una prueba sin servidor, ejecutar `npm run build`, `npm run preview`, abrir la PWA y elegir **Probar aviso local**. Esa prueba solicita permiso y utiliza `showNotification`, sin afirmar que hubo un envío remoto. El botón «Generar aviso de obras demo» verifica preferencias e historial local.

Cerrar sesión en Supabase elimina la suscripción push del dispositivo y cancela la suscripción del navegador. También se puede dar de baja desde Notificaciones.

Los avisos locales de estacionamiento dependen de que la aplicación esté visible. El navegador puede suspender pestañas y la ejecución de temporizadores: solo el programador remoto resuelve el caso de la aplicación cerrada, sin garantizar tiempos de entrega del sistema operativo.

## Verificación del código del servidor

```sh
npx deno check --no-config --no-lock --node-modules-dir=none supabase/functions/send-push/index.ts
```

Los resultados de la comprobación alojada y la entrega a dispositivos figuran en [pruebas](PRUEBAS.md).
