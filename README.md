# Nike Run Club Dashboard

Dashboard de rendimiento de running con diseño Nike (volt green / negro), construido en React + Vite. Lee los datos de actividades directamente desde Google Drive en cada carga de página — sin backend, sin base de datos.

## Características

- KPIs: km totales, carreras, distancia promedio, mejor ritmo, carrera más larga
- Comparativo año contra año: km y carreras por mes
- Ritmo promedio por mes y carreras por día de la semana
- Historial de carreras con filtros por año/mes y paginación
- Mapa de rutas GPS (Leaflet) con selección individual de carrera
- Modo oscuro / claro con paleta Nike

## Fuente de datos

La app lee en tiempo real (en el navegador) desde una carpeta de Google Drive que contiene:
- `activities.csv` — export GDPR de Strava
- `activities/` — archivos `.fit.gz` con los puntos GPS

Todo el procesamiento (parseo de CSV, descompresión gzip, decodificación FIT, agregaciones) ocurre client-side vía `src/lib/driveData.js`.

## Setup

```bash
npm install
cp .env.example .env
```

Edita `.env` con tu propia API key de Google Drive y el ID de tu carpeta:

```
VITE_GOOGLE_API_KEY=tu_api_key
VITE_DRIVE_FOLDER_ID=tu_folder_id
```

Para crear la API key: [Google Cloud Console](https://console.cloud.google.com) → habilitar **Google Drive API** → Credentials → Create API key. La carpeta de Drive debe estar compartida como "Cualquiera con el enlace puede ver".

```bash
npm run dev
```

## Build

```bash
npm run build
```
