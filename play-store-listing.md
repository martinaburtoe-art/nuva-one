# Ficha de Google Play — Nüva One (borrador)

## Título (30 caracteres máx.)
Nüva One: Gestión PyME

## Descripción breve (80 caracteres máx.)
Gestiona tu negocio: ventas, caja, WhatsApp e IA. Todo en una app.

## Descripción completa (4000 caracteres máx.)
Nüva One es la plataforma todo-en-uno para dueños de PyMEs en Chile que quieren dejar de administrar su negocio a punta de planillas Excel y WhatsApp personal.

Con Nüva One puedes:

📊 Punto de venta y caja
Registra ventas, controla stock y cierra caja desde el celular, sin planillas.

🤖 Asistente con inteligencia artificial
Pregúntale a tu negocio: "¿cuánto vendí ayer?", "¿qué productos se me están acabando?" y obtén respuestas al instante.

💬 WhatsApp Business integrado
Consulta los datos de tu negocio directo desde WhatsApp, sin abrir la app.

🔒 Seguro y privado
Cada negocio ve solo su información. Cumplimos con la Ley de Protección de Datos Personales de Chile.

📈 Pensado para crecer contigo
Empieza gratis 15 días. Sin tarjeta de crédito. Actualiza cuando lo necesites.

Ideal para almacenes, minimarkets, boutiques, servicios y cualquier PyME que quiera profesionalizar su gestión sin pagar licencias caras ni contratar un equipo de TI.

---
*Nota: personaliza este texto con capturas reales, casos de uso concretos y cualquier diferenciador que quieras destacar antes de publicar.*

## Categoría sugerida
Negocios (Business)

## Clasificación de contenido
Para todo público (no contiene contenido sensible)

## Assets pendientes que TÚ debes proveer (no puedo generarlos por ti sin ver tu app real)
- [ ] Ícono 512x512 px (tengo un borrador en icon-gen/nuva-one-icon-512.png, revísalo/ajústalo)
- [ ] Gráfico de funciones (Feature Graphic) 1024x500 px
- [ ] Mínimo 2 capturas de pantalla del teléfono (recomendado 4-8), formato PNG/JPG
- [ ] Política de privacidad: URL pública, ej. https://nuva-one.vercel.app/privacy (verificar que cargue sin login)
- [ ] Video promocional (opcional)

## Checklist técnico restante antes de subir a Play Console
- [x] Target API level 36 (Android 16) — ya cumplido, verificado en `android/variables.gradle`
- [x] Firma de release configurada (keystore + build.gradle)
- [x] Minificación + ProGuard con reglas de Capacitor
- [x] Eliminación de cuenta accesible in-app (Configuración > Seguridad)
- [x] Aviso de "sin conexión" (evita pantalla en blanco, mitiga rechazo por política 4.3)
- [ ] Generar cuenta de desarrollador en Play Console (pago único USD 25)
- [ ] Guardar el keystore (`nuva-one-release.keystore`) y su contraseña en un gestor de contraseñas
- [ ] Generar el AAB firmado: `cd android && ./gradlew bundleRelease`
- [ ] Completar el formulario "Data safety" de Play Console — debe declarar:
      - Datos de contacto (email, teléfono) — recolectados, usados para funcionalidad de la cuenta
      - Datos financieros (ventas, inventario, facturación) — recolectados, no compartidos con terceros
      - Mensajes de WhatsApp (números, contenido) — recolectados, usados para el asistente IA
      - Eliminación de cuenta: SÍ disponible in-app (Configuración > Seguridad > "Eliminar mi cuenta")
- [ ] Verificar que `/privacy` y `/terms` cargan sin necesidad de login (Google los revisa así)
- [x] Push notifications implementadas en código (alertas de stock bajo) — falta solo:
      1. Crear proyecto en https://console.firebase.google.com
      2. Agregar app Android con applicationId `cl.nuvaone.app`
      3. Descargar `google-services.json` → colocar en `android/app/google-services.json`
      4. Generar service account (Configuración del proyecto > Cuentas de servicio > Generar clave privada)
      5. En Vercel, agregar variables de entorno: `FIREBASE_PROJECT_ID` y `FIREBASE_SERVICE_ACCOUNT_JSON` (el JSON completo de la service account, como string)
      6. [HECHO] Los 3 crons ya están programados vía pg_cron/pg_net directo en Supabase:
         `nuva-check-overdue-daily` (09:00 Chile), `nuva-quotes-followup-daily` (09:30 Chile),
         `nuva-low-stock-check-every-6h` (cada 6 horas)

## ⚠️ ACCIÓN URGENTE — CRON_SECRET
Los 3 crons de arriba ya están corriendo contra producción, pero solo funcionarán con
autenticación real si agregas esta variable de entorno en Vercel (Project Settings >
Environment Variables), exactamente con este valor:

```
CRON_SECRET=d2407b2112e50b89a6281a6c4e72177b8cb3cd2acaaa100cdee9e4c04a1ebc0e
```

Sin esto, los endpoints `check-overdue`, `follow-up` y `low-stock-check` aceptan
peticiones sin autenticar (el código actual omite la validación si la variable no
existe). Agrégala cuanto antes y vuelve a desplegar.
- [ ] Probar la app en un teléfono real de gama baja (pantalla chica, Android 10-12) antes de publicar

