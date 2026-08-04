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
- [ ] Generar cuenta de desarrollador en Play Console (pago único USD 25)
- [ ] Guardar el keystore (`nuva-one-release.keystore`) y su contraseña en un gestor de contraseñas — sin él no puedes actualizar la app nunca más
- [ ] Generar el AAB firmado: `cd android && ./gradlew bundleRelease`
- [ ] Completar el formulario "Data safety" de Play Console (qué datos recolecta la app: teléfono, datos de negocio, etc.)
- [ ] Decidir: implementar push notifications de verdad (requiere proyecto Firebase) o dejarlo fuera del release inicial
