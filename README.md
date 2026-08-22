# TuMaraña.com — Production V2

Marketplace/directorio de servicios con:

- Backend Flask como API REST pura (JSON), sin plantillas server-rendered.
- Frontend React (Vite, JavaScript) consumiendo la API y Supabase Auth directamente.
- Supabase PostgreSQL + RLS para aislar solicitudes y mensajes.
- Supabase Auth (clientes/profesionales) y Supabase Realtime para el chat.
- Registro de profesionales con aprobación, contacto por WhatsApp, y página "Mis solicitudes".
- Branding TuMaraña.com: azul turquí, amarillo/naranja y verde del isotipo.

## Estructura

```text
tumaraña/
├── backend/
│   ├── app/
│   │   ├── routes.py          # endpoints /api/* y /health
│   │   ├── supabase_client.py
│   │   └── __init__.py
│   ├── run.py
│   ├── requirements.txt
│   ├── Procfile
│   └── render.yaml
├── frontend/
│   ├── src/                   # app React (Vite)
│   ├── public/                # logo, favicons
│   └── vercel.json
├── supabase/
│   ├── schema.sql
│   └── migrations/
└── DEPLOYMENT.md
```

## Local

Backend:

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env  # Windows
# cp .env.example .env  # Linux/macOS
python run.py
```

Frontend:

```bash
cd frontend
npm install
copy .env.example .env  # Windows
# cp .env.example .env  # Linux/macOS
npm run dev
```

El servidor de Vite (`:5173`) hace proxy de `/api` y `/health` hacia el backend Flask (`:5000`) en desarrollo.

## Producción

1. Crear proyecto en Supabase.
2. Ejecutar `supabase/schema.sql` y luego `supabase/migrations/*.sql` en orden, en el SQL Editor.
3. Crear/confirmar usuarios en Supabase Auth.
4. Backend en Render: variables `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `FRONTEND_ORIGIN` (dominio de Vercel).
5. Frontend en Vercel: variables `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`; `vercel.json` hace el proxy de `/api` y `/health` hacia Render.

Nunca poner `SUPABASE_SERVICE_ROLE_KEY` en el frontend ni en el backend. La app utiliza la `anon key` + JWT del usuario y RLS.
