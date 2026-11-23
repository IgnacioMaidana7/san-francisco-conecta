# Guion de demostración en clase

Duración sugerida: 8–10 minutos. Ejecutar `INICIAR.cmd` para desarrollo o `npm run build` y `npm run preview` para mostrar la PWA. Usar un navegador con datos del sitio limpios si se quieren recuperar los ejemplos originales. Los cambios se conservan entre recargas.

1. **Presentación.** Mostrar inicio móvil y explicar que es una PWA no nativa desarrollada con Ionic React. Señalar «Demo local» y la ausencia de cobros reales.
2. **Bicicletas.** Abrir el mapa, seleccionar una estación y revisar bicicletas/anclajes. Tocar «Cerca de mí» si se permite ubicación; si se está lejos de San Francisco, aclarar la distancia. Simular disponibilidad y registrar un problema.
3. **Tributaria.** Descargar un cedulón PDF y señalar la leyenda sin validez fiscal. Simular un pago, confirmar, abrir el historial y descargar el comprobante. Recargar para mostrar persistencia.
4. **Reclamos.** Crear un reclamo de alumbrado con una foto o PDF pequeño. Buscarlo por dirección. Simular avance y abrir el seguimiento para ver cada estado.
5. **Atención.** Mostrar búsqueda de áreas y enlaces de teléfono/correo/WhatsApp. Explicar que son canales publicados en el sitio oficial. No realizar llamadas ni enviar mensajes durante la prueba.
6. **Alarmas.** Mantener la suscripción a Centro. Simular activación de Plaza Cívica y abrir Notificaciones para ver el aviso. Suscribir Norte para mostrar preferencias por zona.
7. **Estacionamiento.** Elegir Centro, patente `AB123CD` y 60 minutos. Confirmar pago demo. Mostrar el reloj, extender 30 minutos, recargar y finalizar. Ver el comprobante en el historial de pagos.
8. **Notificaciones.** Desactivar Obras públicas y generar un evento: no aparece un aviso nuevo. Reactivar y repetir. Mostrar pausa y frecuencia de 24 horas. Si se usa la compilación PWA, probar el aviso local y conceder permiso si se desea.
9. **Arquitectura.** Abrir el [informe técnico en PDF](Informe-Tecnico-San-Francisco-Conecta-TP5.pdf) y explicar el contrato Repository y sus dos adaptadores. Mostrar las migraciones, las pruebas y la demo conectada con Supabase y Web Push.
10. **Offline.** En la compilación PWA, esperar a que se instale el service worker, desconectar la red y recargar. Los datos locales y pantallas siguen disponibles; los mapas necesitan las teselas de internet.

Para demostrar cambios desde dos pestañas, abrir ambas con la misma dirección y puerto. Una acción local se refleja en la otra. En Supabase esta propagación utiliza Realtime.
