# FaltApp

PWA para controlar las faltas en los módulos de Formación Profesional en Aragón, según el **Decreto 91/2024** (arts. 18 y 19). Escanea una foto del horario y la app crea los módulos, estima sus horas y te dice cuántas faltas te quedan antes de perder la evaluación continua.

**Stack:** React 19 + TypeScript + Vite, Tailwind CSS 4, Motion, `vite-plugin-pwa` (Workbox) y una función de Vercel que llama a Claude para leer los horarios.

## Desarrollo

```sh
npm install
cp .env.example .env   # y rellena ANTHROPIC_API_KEY (y ACCESS_CODE si quieres)
npm run dev            # http://localhost:5173
```

`npm run dev` sirve también `/api/horario` con el mismo código que en producción, así que no hace falta la CLI de Vercel. `npm run build && npm run preview` prueba la versión final con el service worker.

## Publicar en Vercel

1. Sube el proyecto a GitHub e impórtalo en [vercel.com/new](https://vercel.com/new) (detecta Vite solo), o usa `npx vercel` desde esta carpeta.
2. En **Project → Settings → Environment Variables** añade:
   - `ANTHROPIC_API_KEY`: tu clave de Anthropic.
   - `ACCESS_CODE`: un código para tu clase (recomendado). Tus compañeros lo escriben una vez al escanear su horario.
3. Vuelve a desplegar para que coja las variables.
4. En [console.anthropic.com](https://console.anthropic.com/settings/limits) pon un **límite de gasto mensual**: cada lectura cuesta unos céntimos y la paga tu clave.

Instalar en el móvil: en Android/Chrome sale el botón «Instalar»; en iPhone, Safari → Compartir → «Añadir a pantalla de inicio».

## Reglas que aplica

- **Art. 19 — el 15 %:** al llegar al 15 % de la duración total del módulo se pierde la evaluación continua (la app usa siempre el 15 %, el máximo del decreto). Cada falta es una hora lectiva; la app muestra cuántas horas puedes faltar sin llegar al umbral (p. ej. 128 h → umbral 19,2 → puedes faltar 19).
- **Art. 18 — la carta de los 5 días:** 5 días lectivos seguidos sin asistir, o 10 en un periodo de 30 días lectivos. Un día cuenta como «sin asistir» cuando tienes anotadas faltas en todas las horas de tu horario de ese día.
- La duración de cada módulo se estima con el horario y las fechas del curso (sin Navidad); conviene corregirla con la de la programación didáctica. Los festivos no se descuentan.

## Cómo funciona

- **Datos:** cada persona tiene sus módulos y faltas en su propio dispositivo (`localStorage`). No hay cuentas ni base de datos. Desde Ajustes se puede exportar/importar una copia.
- **Escanear horario:** la app reduce la foto, la manda a `/api/horario` y la función pide a Claude (`claude-opus-5-5`, salida JSON con esquema) las sesiones semanales de cada módulo. Cada bloque cuenta sus horas lectivas (8:00–9:50 = 2 h).
- **Protección de la API:** código de clase (`ACCESS_CODE`), límite de 8 lecturas por hora por IP y tamaño máximo de imagen.
- **PWA:** funciona sin conexión (salvo escanear), avisa cuando hay una versión nueva y ofrece instalarse.

## Estructura

```
api/horario.ts          Función de Vercel: lee la foto con Claude
src/App.tsx             Rutas, paneles y avisos
src/components/         Pantallas (Home, SubjectDetail) y paneles (sheets/)
src/lib/store.ts        Estado y guardado en localStorage
src/lib/logic.ts        Reglas del decreto, cálculos de horas, fechas y horario
src/lib/api.ts          Cliente de /api/horario y compresión de la foto
vite.config.ts          PWA, Tailwind y la API en local
```
