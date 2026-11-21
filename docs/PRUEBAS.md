# Verificación de la entrega

Fecha: 21/11/2026. Entorno: Windows, Node.js 22.14.0, compilación de producción y adaptador demo. Dependencias fijadas mediante `package-lock.json`.

## Resultados

| Comprobación                                 | Resultado                                                                                                  |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| TypeScript estricto y `npm run build`        | Correcto; manifiesto, service worker y recursos instalables generados                                      |
| `npm test`                                   | 16 pruebas aprobadas. 7 de reglas y 9 de migraciones, aislamiento y operaciones                            |
| Playwright: recorridos Chromium móvil        | 7 pruebas completas aprobadas                                                                              |
| Playwright + axe: Chromium, WebKit y Firefox | 3 pruebas aprobadas: ocho pantallas y menú móvil, WCAG A/AA 2.0 y 2.1                                      |
| Auditoría de dependencias `npm audit`        | 0 vulnerabilidades informadas, incluidas dependencias de desarrollo                                        |
| Migraciones PostgreSQL                       | Ejecutadas en PGlite y en el proyecto remoto de Supabase                                                   |
| Función push                                 | Desplegada en Supabase. El cron registra HTTP 200 y la función rechaza peticiones sin secreto con HTTP 401 |
| Capturas                                     | Inicio móvil/escritorio y estacionamiento móvil, en `capturas/`                                            |
| Lighthouse móvil simulado                    | Rendimiento 94, accesibilidad 100, buenas prácticas 100, SEO 100                                           |

### Flujos automatizados de extremo a extremo

1. Navegar por los siete módulos sin errores JavaScript ni desbordamiento horizontal. Verificar los enlaces publicados de teléfono, correo y WhatsApp sin realizar comunicaciones.
2. Descargar cedulón PDF, confirmar un pago demo, recargar y revisar la persistencia e historial.
3. Crear un reclamo con adjunto, buscarlo, avanzar estado y revisar seguimiento después de recargar.
4. Rechazar patente inválida, iniciar estacionamiento, extender 30 minutos, verificar reloj/persistencia y finalizar.
5. Cambiar disponibilidad de bicicletas, reportar un problema, generar una alarma de zona suscripta y comprobar que una categoría desactivada no crea un aviso.
6. Verificar manifiesto e icono, instalar el service worker, probar un aviso local con permiso concedido y recargar sin conexión con datos locales.
7. Guardar capturas de la interfaz.

Las comprobaciones de compatibilidad recorren además las ocho pantallas con cada motor e inspeccionan automáticamente problemas de accesibilidad. WebKit de Playwright es una aproximación al motor de Safari; no sustituye un iPhone físico ni certifica su integración con el sistema operativo.

### Base de datos y seguridad

Las pruebas usan PostgreSQL WASM, sin Docker ni credenciales externas. Ejecutan las migraciones reales y verifican:

- Creación de preferencias y obligaciones demo por cuenta.
- RLS: cada usuario solo lee sus registros.
- Rechazo de escritura directa en deudas y pagos.
- Rechazo de pago ajeno/duplicado y un único comprobante por obligación.
- Validación de minutos, bloqueo de sesiones activas duplicadas y extensión con tarifa calculada en servidor.
- Seguimiento inicial de reclamos y rechazo de metadatos de adjuntos de otra cuenta.
- Aislamiento de carpetas privadas de Storage mediante las políticas SQL.
- Renovación de la suscripción push y rechazo de cambios desde otra cuenta.
- Alertas de alarmas solo para zonas suscriptas y deduplicación de vencimientos.
- Revocación de acceso del vecino a funciones internas y recordatorios globales.

El banco crea versiones mínimas de `auth.users`, `auth.uid()` y `storage.objects` para probar SQL y permisos. **No verifica** el servicio HTTP de Storage, la entrega de correos de Auth, WebSockets Realtime ni la infraestructura alojada de Supabase.

## Rendimiento

Se conservan `mediciones/lighthouse.html` (informe completo) y `mediciones/lighthouse.json` (resumen). Lighthouse 12.6.1, Chromium automatizado, perfil móvil con ralentización simulada, URL local, arranque en modo demo:

| Métrica                  | Resultado |
| ------------------------ | --------- |
| First Contentful Paint   | 2,30 s    |
| Largest Contentful Paint | 2,54 s    |
| Speed Index              | 2,30 s    |
| Total Blocking Time      | 90 ms     |
| Cumulative Layout Shift  | 0,00039   |

La medición cumple el objetivo de contenido inicial inferior a 3 segundos **en este perfil**. No garantiza ese tiempo en toda red o teléfono. La primera consulta de mapas depende de OpenStreetMap; Supabase agrega tiempos de red que no están incluidos en el modo demo.

Se eligió Ionic React 8.7.17 con carga diferida de componentes, se dividieron las pantallas y la generación de PDF por ruta, se empaquetaron fuentes locales y se usa compresión HTTP en `npm run preview`. El paquete inicial quedó en aproximadamente 494 kB sin comprimir / 151 kB gzip. Un alojamiento real debe habilitar HTTPS y compresión. El resto de archivos se precachea para futuras visitas.

Para repetir Lighthouse se puede usar una instalación temporal, con Chrome disponible:

```sh
npx lighthouse@12.6.1 http://127.0.0.1:4173/ --output=html --output=json --output-path=./docs/mediciones/lighthouse --chrome-flags=--headless
```

La herramienta de medición no es una dependencia de ejecución ni de instalación del proyecto. El informe se generó durante la entrega y se conserva como evidencia.

## Revisión estática de React

Se ejecutó React Doctor y se revisaron los resultados; no se suprimieron reglas para ocultarlos. Se corrigieron el nombre accesible del diálogo, el contexto reconstruido y la suscripción de conectividad, además del contraste detectado por axe.

La herramienta conserva dos diagnósticos heurísticos de error: considera sin limpieza las suscripciones de Leaflet, aunque cada `marker.on` tiene un `marker.off`, la capa se limpia, el mapa se destruye y el `ResizeObserver` se desconecta; y considera insegura la escritura de `user_id`, aunque la propiedad se verifica con `auth.uid()` mediante RLS. Se clasificaron como falsos positivos con confianza alta, respaldados por el código y las pruebas entre cuentas.

Las advertencias restantes son consultas a arrays pequeños (3 zonas/7 categorías), cargas secuenciales de hasta tres archivos para poder compensar fallos, envío acotado de notificaciones y una URL temporal cuyo consumidor la revoca después de abrir el archivo. El resultado numérico de esa herramienta no se utiliza como certificación de seguridad.

## Demo conectada verificada

Se usó un proyecto gratuito separado en Supabase. El registro desde la aplicación funciona en modo académico con acceso inmediato, y se verificaron el inicio de sesión, el aislamiento de filas entre dos cuentas, la descarga de un adjunto con URL firmada, el rechazo del acceso desde otra cuenta y la recepción de un evento de reclamo por WebSocket. Un cedulón se pagó en modo simulado y un segundo intento sobre la misma obligación fue rechazado. Se eliminaron las cuentas y archivos de prueba.

El cron de un minuto está activo. Chrome registró una suscripción Web Push real, recibió un aviso remoto generado por un pago simulado y mostró el aviso en el service worker. También se verificaron el aviso local y el rechazo de peticiones sin el secreto del cron.

## Pendientes de aceptación externa

| Prueba                                             | Configuración necesaria                                                           |
| -------------------------------------------------- | --------------------------------------------------------------------------------- |
| Verificación y recuperación por correo             | Proveedor SMTP y configuración de confirmación                                    |
| Prueba de push con app cerrada en teléfonos        | Alojamiento HTTPS y permiso en un dispositivo físico                              |
| Instalación y notificaciones en iOS/Android reales | Dispositivos físicos y dominio HTTPS                                              |
| Información municipal operativa                    | APIs autorizadas y datos oficiales de estaciones, alarmas, tarifas y obligaciones |

No se hicieron cobros, no se activaron sirenas, no se enviaron mensajes ni se realizaron llamadas a los contactos. Los controles de demostración operan sobre datos ilustrativos.

## Repetir la suite

```sh
npm ci
npm test
npm run build
npx playwright install chromium firefox webkit
npm run test:e2e
npm audit
```

En Linux puede ser necesario instalar los requisitos del navegador con `npx playwright install --with-deps chromium firefox webkit`. Las trazas de fallos quedan en `test-results/` (no versionado).
