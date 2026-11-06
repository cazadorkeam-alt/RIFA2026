# Sistema de venta de boletos — Rifa (300 números)

Sistema completo para vender/apartar boletos de tu rifa del **1 de diciembre**
mediante un solo enlace, con panel de administrador protegido por contraseña.
Nadie necesita crear una cuenta para apartar un número; tú controlas todo
desde el panel de admin.

---

## 1. Qué incluye y por qué se hizo así (explicado en simple)

| Pieza | Para qué sirve | Por qué esta opción |
|---|---|---|
| **Vercel** (gratis) | Aloja la página web y le da el enlace público (`https://tu-rifa.vercel.app`) | Es gratis para este tamaño de uso, no hay servidores que mantener, y las copias de seguridad de tráfico/caídas las maneja Vercel solo |
| **Supabase** (gratis) | Es la base de datos: la lista de 300 números y quién apartó cada uno | Base de datos real (Postgres) con panel visual, plan gratuito generoso, y permite que la reserva de un número sea **a prueba de dos personas apretando "Apartar" al mismo tiempo** |
| **Página pública** (`index.html`) | La cuadrícula de 300 números que ve cualquier persona con el enlace | Sin necesidad de instalar nada ni crear cuenta |
| **Panel admin** (`/admin`) | Ver todo, marcar pagos, liberar números, ver el total recaudado | Protegido con una contraseña que tú eliges |

**¿Cómo se evita que dos personas se queden con el mismo número?**
Cuando alguien aprieta "Apartar", el sistema le pide a la base de datos que
primero "bloquee" esos números (como pedir la llave de una caja antes de
abrirla), revise si siguen disponibles, y solo si TODOS siguen disponibles
los marca como apartados — todo en un solo paso indivisible. Si dos personas
aprietan el mismo número al mismo instante, una gana y a la otra se le avisa
de inmediato "ese número ya no está disponible" para que elija otro.

**Diferencia entre "apartado" y "vendido" (pagado):**
- 🟡 **Apartado**: alguien eligió el número y dejó su nombre/teléfono, pero
  tú (el administrador) todavía no confirmas que pagó.
- 🔴 **Vendido**: tú ya revisaste el pago (transferencia, efectivo, etc.) y
  lo marcaste como pagado desde el panel admin. Ese número ya es definitivo.
- 🟢 **Disponible**: nadie lo ha tomado todavía.

---

## 2. Estructura de archivos

```
rifa-300-boletos/
├── api/
│   ├── config.js          → datos públicos de la rifa (título, precio, fecha)
│   ├── tickets.js         → lista pública de números y su estado
│   ├── reserve.js         → apartar uno o varios números (a prueba de duplicados)
│   └── admin/
│       ├── login.js       → entrar al panel con contraseña
│       ├── logout.js      → cerrar sesión
│       ├── me.js          → saber si la sesión de admin sigue activa
│       ├── list.js        → lista completa (con nombre/teléfono) + totales
│       └── update.js      → cambiar el estado de un número
├── lib/
│   ├── db.js              → conexión a Supabase
│   └── auth.js            → maneja la sesión del admin (cookie firmada)
├── public/
│   ├── index.html / app.js / styles.css   → página pública
│   └── admin.html / admin.js / admin.css  → panel de administrador
├── sql/
│   └── schema.sql         → crea la tabla y los 300 boletos (ejecutar 1 vez)
├── package.json
├── vercel.json
└── .env.example           → nombres de las variables que debes configurar
```

No hay que instalar nada en tu computadora para desplegarlo (ver sección 3,
Opción A). Solo necesitas un navegador.

---

## 3. Desplegarlo (paso a paso)

Vas a necesitar 3 cuentas gratuitas: **GitHub**, **Supabase** y **Vercel**.
Todo se hace desde el navegador, sin instalar programas.

### Paso 1 — Sube el proyecto a GitHub

1. Entra a [github.com](https://github.com) y crea una cuenta (si no tienes).
2. Click en **"New repository"** (Nuevo repositorio). Ponle un nombre, por
   ejemplo `rifa-diciembre`. Déjalo en **Private** o **Public**, como
   prefieras. No marques ninguna casilla adicional. Click **"Create repository"**.
3. En la página del repositorio recién creado, busca el enlace
   **"uploading an existing file"** (subir un archivo existente).
4. Abre en tu computadora la carpeta `rifa-300-boletos` que te entregué, y
   **arrastra todo su contenido** (todas las carpetas y archivos) a la
   ventana del navegador donde dice "Drag files here to add them to your
   repository". GitHub conserva las carpetas automáticamente.
5. Baja hasta el final de la página y click **"Commit changes"**.

> Tu código ya está en GitHub. Esto es lo que Vercel va a leer para publicar
> tu página.

### Paso 2 — Crea la base de datos en Supabase

1. Entra a [supabase.com](https://supabase.com) y crea una cuenta gratuita.
2. Click **"New project"**. Ponle un nombre (por ejemplo `rifa-diciembre`),
   crea una contraseña para la base (guárdala, aunque no la usarás seguido)
   y elige la región más cercana a ti. Espera 1-2 minutos a que se cree.
3. En el menú izquierdo entra a **"SQL Editor"** → **"New query"**.
4. Abre el archivo `sql/schema.sql` de este proyecto, copia **todo** su
   contenido, pégalo en el editor de Supabase, y click **"Run"**.
   - Esto crea la tabla de boletos, los 300 números, y la función que evita
     que dos personas se queden con el mismo número.
5. Ahora ve a **"Project Settings"** (ícono de engranaje) → **"API"**.
   Vas a copiar dos datos que usarás en el siguiente paso:
   - **Project URL** (algo como `https://xxxxx.supabase.co`)
   - **service_role key** (una clave larga; está debajo de "anon" — usa la
     que dice "service_role", NO la "anon/public")

> ⚠️ La clave `service_role` es poderosa (tiene acceso total a tu base de
> datos). Nunca la compartas ni la pongas en el código público; solo va en
> las variables de entorno de Vercel (siguiente paso).

### Paso 3 — Publica el sitio en Vercel

1. Entra a [vercel.com](https://vercel.com) y crea una cuenta gratuita
   **usando tu cuenta de GitHub** (botón "Continue with GitHub").
2. Click **"Add New..."** → **"Project"**.
3. Busca y selecciona el repositorio `rifa-diciembre` que subiste en el
   Paso 1, y click **"Import"**.
4. Antes de desplegar, abre la sección **"Environment Variables"** y agrega
   una por una (nombre y valor), usando `.env.example` como referencia:

   | Nombre | Valor |
   |---|---|
   | `SUPABASE_URL` | el Project URL que copiaste de Supabase |
   | `SUPABASE_SERVICE_ROLE_KEY` | la clave service_role que copiaste |
   | `ADMIN_PASSWORD` | la contraseña que tú quieras para entrar al panel admin |
   | `SESSION_SECRET` | cualquier texto largo y aleatorio (ej. `a8f3-x92k-rifa-2026-xyz`) |
   | `RAFFLE_TITLE` | ej. `Rifa de Diciembre` |
   | `RAFFLE_DATE` | ej. `1 de diciembre de 2026` |
   | `TOTAL_TICKETS` | `300` |
   | `TICKET_PRICE` | ej. `100` |
   | `CURRENCY` | `MXN` (o tu moneda) |
   | `CONTACT_WHATSAPP` | tu número con código de país, ej. `5213312345678` |
   | `PAYMENT_INFO` | ej. `Transferencia a CLABE 0000 0000 0000 0000 (Tu Nombre)` |

5. Click **"Deploy"**. Espera un minuto.
6. Cuando termine, Vercel te da tu enlace público, algo como
   `https://rifa-diciembre.vercel.app`. **Ese es el enlace que compartes**
   con la gente para que aparte sus números.
   El panel de administrador está en `https://rifa-diciembre.vercel.app/admin`.

¡Listo! Tu rifa ya está en línea.

### ¿Cómo actualizo algo después (precio, fecha, contraseña)?

En Vercel: tu proyecto → **"Settings"** → **"Environment Variables"**, edita
el valor que quieras, guarda, y entra a **"Deployments"** → en el último
despliegue click los tres puntos → **"Redeploy"**. En 30-60 segundos el
cambio ya está en línea. No necesitas tocar código.

---

## 4. Guía de uso para el administrador

### Entrar al panel

Abre `https://tu-rifa.vercel.app/admin` e ingresa la contraseña que
configuraste en `ADMIN_PASSWORD`. La sesión dura 12 horas; después te pedirá
la contraseña otra vez.

### Qué puedes ver

- **Tarjetas de resumen**: cuántos boletos están disponibles, apartados,
  vendidos, y el **total recaudado** (se calcula automáticamente:
  boletos vendidos × precio por boleto).
- **Tabla completa**: cada número, su estado, el nombre y teléfono de quien
  lo apartó, cuándo lo apartó, cuándo se marcó como pagado, y una nota libre.
- **Filtros** (Todos / Disponibles / Apartados / Vendidos) y una **barra de
  búsqueda** por número, nombre o teléfono.

### Acciones disponibles por boleto

- **Marcar pagado**: cuando confirmes que alguien transfirió o pagó en
  efectivo, click este botón en su número. Pasa de 🟡 Apartado a 🔴 Vendido
  y se suma al total recaudado.
- **Liberar**: si alguien apartó un número y no pagó a tiempo, o se
  equivocó, este botón lo regresa a 🟢 Disponible (borra el nombre/teléfono
  guardado para ese número).
- **Apartar** (en números disponibles): te permite registrar manualmente a
  alguien que te compró un número por teléfono o en persona, sin que use el
  enlace.
- **Editar**: abre una ventana donde puedes cambiar el estado, el nombre, el
  teléfono o agregar una nota a cualquier número.

### Cerrar sesión

Botón **"Cerrar sesión"** arriba a la derecha del panel.

---

## 5. Después de la rifa (opcional)

### Reiniciar todos los boletos para una próxima rifa

En Supabase → **SQL Editor**, ejecuta:

```sql
update tickets
set status = 'disponible',
    buyer_name = null,
    buyer_phone = null,
    note = null,
    reserved_at = null,
    paid_at = null;
```

### Usar más o menos de 300 números la próxima vez

1. Antes de ejecutar `schema.sql`, cambia el número `300` por el que
   necesites en la línea `select generate_series(1, 300)`.
2. En Vercel, cambia la variable `TOTAL_TICKETS` al mismo número.

---

## 6. Costos

Con 300 boletos y el tráfico esperado de una rifa pequeña, este sistema se
mantiene **dentro de los límites gratuitos** tanto de Vercel (plan Hobby)
como de Supabase (plan Free). No se requiere tarjeta de crédito para
ninguno de los dos mientras te mantengas en ese uso.

## 7. Seguridad — qué sabe cada persona

- Cualquiera con el enlace puede **ver** la cuadrícula de números y su
  color (disponible/apartado/vendido), y apartar números disponibles.
  Nadie puede ver el nombre o teléfono de otros compradores desde la
  página pública — esos datos solo los ve el administrador logueado.
- El sitio corre siempre con HTTPS (candado de seguridad) de forma
  automática, cortesía de Vercel.
- Cambia `ADMIN_PASSWORD` por algo que no sea fácil de adivinar, y no
  compartas el enlace `/admin` públicamente.
