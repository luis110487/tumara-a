# TuMaraña.com — Production V1

Marketplace/directorio de servicios con:

- Frontend Flask server-rendered, responsive.
- Backend Flask + API REST.
- Supabase PostgreSQL.
- Supabase Auth (clientes/profesionales).
- RLS para aislar solicitudes y mensajes.
- Supabase Realtime para el chat.
- Registro de profesionales con aprobación.
- Buscador, categorías, perfiles y solicitudes.
- Branding TuMaraña.com: azul turquí, amarillo/naranja y verde del isotipo.

## Estructura

```text
TuMarana/
├── tumarana/
│   ├── app/
│   │   ├── routes.py
│   │   ├── supabase_client.py
│   │   ├── templates/
│   │   └── static/
│   ├── run.py
│   ├── requirements.txt
│   ├── Procfile
│   ├── render.yaml
│   └── .env.example
├── supabase/
│   └── schema.sql
└── DEPLOYMENT.md
```

## Local

```bash
cd tumarana
python -m venv .venv
# Windows: .venv\\Scripts\\activate
# Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env  # Windows
# cp .env.example .env  # Linux/macOS
python run.py
```

## Producción

1. Crear proyecto en Supabase.
2. Ejecutar `supabase/schema.sql` en SQL Editor.
3. Crear/confirmar usuarios en Supabase Auth.
4. Copiar `SUPABASE_URL` y `SUPABASE_ANON_KEY` a Render.
5. Render ejecutará Gunicorn mediante `render.yaml`.
6. Configurar dominio y HTTPS.

Nunca poner `SUPABASE_SERVICE_ROLE_KEY` en frontend ni en este proyecto. La app utiliza la `anon key` + JWT del usuario y RLS.
