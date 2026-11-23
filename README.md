# San Francisco Conecta

Aplicación web móvil **PWA no nativa**, desarrollada para el TP5 de Arquitecturas Móviles de UTN San Francisco. Ionic React + TypeScript, Leaflet/OpenStreetMap y adaptadores intercambiables local/Supabase.

**Los pagos son exclusivamente simulados.** No se solicitan tarjetas ni datos bancarios. Los cedulones PDF llevan la leyenda «SIN VALIDEZ FISCAL». Bicicletas, alarmas, zonas, tarifas, deudas y avisos son ilustrativos; los contactos enlazan a canales publicados en el sitio oficial.

## Ejecutar en Windows

Requiere Node.js **22.12 o superior** y conexión para instalar dependencias.

Abrí `INICIAR.cmd` o una terminal en esta carpeta:

```sh
npm ci
npm run dev
```

Abrí **http://127.0.0.1:5173**. El modo demo se inicia sin `.env`, cuentas ni contraseñas y persiste los cambios en este navegador. El archivo `package-lock.json` fija las dependencias probadas.

Para probar la PWA, el caché sin conexión y los avisos locales:

```sh
npm run build
npm run preview
```

Abrí **http://127.0.0.1:4173**. El service worker funciona en producción; no se instala desde `npm run dev`. Para un teléfono físico hace falta un alojamiento HTTPS o un túnel HTTPS. `localhost` del teléfono es el teléfono, no la computadora.

## Funciones implementadas

| Servicio        | Recorrido                                                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Bicicletas      | Mapa, bicicletas/anclajes, geolocalización y orden por cercanía, reportes e historial, simulación de disponibilidad       |
| Tributaria      | Obligaciones pendientes/pagadas, emisión PDF, confirmación de pago demo, historial y comprobantes, recordatorios          |
| Reclamos        | Alta, categoría y dirección, 3 adjuntos de hasta 5 MB, búsqueda, filtro, estados y línea de seguimiento                   |
| Contactos       | Búsqueda por área, teléfono, correo y WhatsApp; enlaces de fuentes oficiales                                              |
| Alarmas         | Mapa, estado actualizado, simulación local, suscripción a zonas y ubicación/radio opcionales                              |
| Estacionamiento | Zonas en mapa, tarifas/horarios, patente, pago demo, reloj, extensión, finalización e historial                           |
| Notificaciones  | Historial, lectura, enlaces internos, categorías, zonas, frecuencia inmediata/24 h/pausa, prueba local y suscripción push |

En la demo, los controles «Simular» representan cambios del operador/API municipal. Las pestañas del mismo navegador reciben cambios mediante eventos `storage`. En Supabase se utiliza Realtime y los controles de simulación se ocultan; un operador actualiza los catálogos/estados desde una herramienta administrativa autorizada.

## Usar la demo conectada a Supabase

El repositorio privado está en [GitHub](https://github.com/IgnacioMaidana7/san-francisco-conecta). El perfil `.env.conectado` apunta al [proyecto Supabase del TP5](https://supabase.com/dashboard/project/wlnxdhalcxnnqbungluy) y trae las claves públicas que usa el navegador. PostgreSQL, Auth, Storage, Realtime y el cron de push ya están configurados.

```sh
npm ci
npm run dev:conectado
```

Abrí http://127.0.0.1:5173 y creá una cuenta de prueba. Para esta demo, el registro da acceso inmediato sin verificar el correo. Usá datos ficticios. Para verificar direcciones y enviar correos de recuperación a usuarios externos se necesita configurar un proveedor SMTP.

Para usar la PWA conectada y probar las notificaciones, ejecutá `npm run build:conectado` y `npm run preview`. Abrí http://127.0.0.1:4173 y elegí **Notificaciones → Activar push** para autorizar este navegador. En un teléfono físico, la PWA necesita una URL HTTPS.

## Conectar otro proyecto Supabase

1. Creá un proyecto Supabase propio si querés una instancia independiente.
2. En SQL Editor ejecutá los archivos de `supabase/migrations/` en orden. También podés usar la CLI:

```sh
supabase login
supabase link --project-ref TU_PROJECT_REF
supabase db push
```

3. Copiá `.env.example` a `.env` y completá:

```dotenv
VITE_DATA_MODE=supabase
VITE_SUPABASE_URL=https://TU_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=TU_CLAVE_PUBLICA_ANON_O_PUBLISHABLE
VITE_VAPID_PUBLIC_KEY=
```

4. Configurá **Auth → URL Configuration**: Site URL y Redirect URLs con tu URL de desarrollo/producción. Habilitá email/password y elegí si confirmar correo; para entrega real configurá SMTP.
5. Reiniciá Vite, registrá tu cuenta y confirmá el correo si corresponde. Cada cuenta recibe obligaciones **demo** y preferencias iniciales. Las cuentas existentes también se preparan al migrar.

Las migraciones crean las tablas, índices, RLS, funciones transaccionales, bucket privado `claim-attachments` (tipos/tamaño restringidos), disparadores e inclusión en la publicación `supabase_realtime`. El rol del vecino puede leer sus filas, insertar reclamos/reportes y cambiar sus preferencias; no puede editar importes, estados de deuda, pagos, estados de reclamos o catálogos. Los pagos demo solo pasan por funciones que calculan los importes del lado servidor.

**Nunca pongas `service_role`, claves VAPID privadas ni secretos de cron en variables `VITE_*`.** La clave pública necesita las políticas RLS incluidas. El modo Supabase falla de forma visible si faltan configuración, migraciones o conectividad: no cambia silenciosamente a la demo.

## Push configurable

La demo conectada usa la función `send-push` y Supabase Cron. Cada persona elige si habilita push en su dispositivo. Para reproducirlo en otro proyecto, seguí la [configuración de Web Push](docs/PUSH.md).

Los temporizadores y recordatorios locales se verifican cada 30 segundos mientras la aplicación está visible y al volver a ella. Para avisar con la app cerrada hace falta el cron remoto. La frecuencia «Resumen a las 24 horas» difiere cada aviso 24 horas; no agrupa múltiples avisos en un único mensaje. Cambiar preferencias afecta la creación de avisos futuros y el envío push pendiente; no borra el historial.

## Pruebas

```sh
npm test
npm run build
npx playwright install chromium firefox webkit
npm run test:e2e
npm audit
```

`npm test` ejecuta reglas y migraciones reales en PostgreSQL WASM (PGlite), con contratos mínimos de Auth/Storage y dos usuarios para verificar RLS. `npm run test:e2e` prueba flujos completos en Chromium móvil contra la compilación, incluyendo descargas, archivos, pagos, estacionamiento, preferencias y recarga offline.

El soporte de Safari/Firefox reales y el rendimiento en teléfonos físicos requieren la matriz manual de [pruebas](docs/PRUEBAS.md). El resultado medido, el alcance y los límites de la verificación están documentados allí.

## Estructura

```text
src/pages/                 Siete módulos y portada
src/components/            UI compartida, mapa y geolocalización
src/domain.ts              Contratos de dominio
src/rules.ts               Validaciones y reglas puras
src/services/contracts.ts  Puerto de persistencia
src/services/mock.ts       Adaptador local + IndexedDB
src/services/supabase.ts   Auth, PostgreSQL, Storage y Realtime
src/sw.ts                  Caché público de la PWA y recepción push
supabase/migrations/       Esquema, permisos, RPC y catálogo demo
supabase/functions/        Envío push del lado servidor
tests/                     Reglas, SQL/RLS y navegador
docs/                      Informe, pruebas, fuentes y capturas
```

## Entrega y pendientes externos

- [Informe técnico del TP5 en PDF](docs/Informe-Tecnico-San-Francisco-Conecta-TP5.pdf) y [resumen técnico en Markdown](docs/INFORME.md).
- [Guion de demostración](docs/DEMOSTRACION.md).
- [Fuentes y material de referencia](docs/FUENTES.md). La guía original está en `docs/referencias/Guia-TP.pdf`, páginas 5–8.
- Para probar la PWA en teléfonos quedan el alojamiento HTTPS de la aplicación y la prueba en dispositivos físicos. SMTP se requiere si la entrega usa verificación de correo o recuperación de contraseña.
- Pendientes para uso municipal: APIs y autorización oficiales, identidades tributarias verificadas, catálogo real de estaciones/zonas/alarmas, horarios y tarifas oficiales, operación administrativa y revisión de privacidad/retención. Este proyecto académico no sustituye esos sistemas.

Para servir `dist/` usá un alojamiento estático con fallback de rutas a `index.html` (incluido ejemplo `public/_redirects`). Supabase se consume por HTTPS desde la PWA; no se necesita un servidor Node en producción.
