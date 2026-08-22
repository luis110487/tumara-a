import os
import requests

class SupabaseError(RuntimeError):
    pass

def cfg():
    url = os.environ.get('SUPABASE_URL', '').rstrip('/')
    key = os.environ.get('SUPABASE_ANON_KEY', '')
    if not url or not key:
        raise SupabaseError('SUPABASE_URL y SUPABASE_ANON_KEY son obligatorias')
    return url, key

def headers(token=None):
    _, key = cfg()
    return {
        'apikey': key,
        'Authorization': f'Bearer {token or key}',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    }

def rest(table, params=None, method='GET', data=None, token=None, prefer=None):
    url, _ = cfg()
    h = headers(token)
    if prefer:
        h['Prefer'] = prefer
    r = requests.request(method, f'{url}/rest/v1/{table}', params=params, headers=h, json=data, timeout=15)
    if r.status_code >= 400:
        raise SupabaseError(f'Supabase REST {r.status_code}: {r.text[:800]}')
    if not r.text:
        return []
    return r.json()

def rpc(name, data, token=None):
    url, _ = cfg()
    r = requests.post(f'{url}/rest/v1/rpc/{name}', headers=headers(token), json=data, timeout=15)
    if r.status_code >= 400:
        raise SupabaseError(f'Supabase RPC {r.status_code}: {r.text[:800]}')
    return r.json() if r.text else None

def auth_user(token):
    if not token:
        return None
    url, _ = cfg()
    r = requests.get(f'{url}/auth/v1/user', headers=headers(token), timeout=10)
    return r.json() if r.status_code == 200 else None
