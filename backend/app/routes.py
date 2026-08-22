from flask import Blueprint, render_template, request, jsonify, abort
from .supabase_client import rest, rpc, auth_user, SupabaseError
from . import csrf

main = Blueprint('main', __name__, static_folder='static', static_url_path='/static')

def bearer():
    value = request.headers.get('Authorization', '')
    return value[7:].strip() if value.startswith('Bearer ') else None

def require_user():
    token = bearer()
    user = auth_user(token) if token else None
    if not user:
        abort(401, description='Autenticación requerida')
    return token, user

def api_error(exc, status=400):
    return jsonify({'error': 'No fue posible completar la operación', 'detail': str(exc)}), status

@main.get('/')
def index():
    try:
        categories = rest('categories', {'select': 'id,name,slug,icon,description', 'is_active': 'eq.true', 'order': 'name.asc'})
        pros = rest('professionals', {'select': 'id,display_name,city,neighborhood,description,experience_years,rating,total_reviews,verified,category_id', 'status': 'eq.approved', 'order': 'verified.desc,rating.desc', 'limit': '8'})
    except SupabaseError:
        categories, pros = [], []
    catmap = {c['id']: c['name'] for c in categories}
    for p in pros:
        p['category'] = catmap.get(p['category_id'], 'Servicio')
    cities = sorted({p.get('city') for p in pros if p.get('city')})
    return render_template('index.html', categories=categories, professionals=pros, cities=cities)

@main.get('/buscar')
def search():
    q = request.args.get('q', '').strip()[:100]
    city = request.args.get('city', '').strip()[:100]
    cat = request.args.get('category', '').strip()
    try:
        categories = rest('categories', {'select': 'id,name,slug,icon,description', 'is_active': 'eq.true', 'order': 'name.asc'})
        params = {'select': 'id,display_name,city,neighborhood,description,experience_years,rating,total_reviews,verified,category_id', 'status': 'eq.approved', 'order': 'verified.desc,rating.desc'}
        if city:
            params['city'] = f'eq.{city}'
        pros = rest('professionals', params)
    except SupabaseError:
        categories, pros = [], []
    catmap = {c['id']: c['name'] for c in categories}
    if cat.isdigit():
        pros = [p for p in pros if str(p['category_id']) == cat]
    if q:
        needle = q.lower()
        pros = [p for p in pros if needle in (p.get('display_name', '') + ' ' + p.get('description', '') + ' ' + catmap.get(p['category_id'], '')).lower()]
    for p in pros:
        p['category'] = catmap.get(p['category_id'], 'Servicio')
    cities = sorted({p.get('city') for p in pros if p.get('city')})
    return render_template('results.html', professionals=pros, categories=categories, cities=cities, q=q, selected_category=cat, selected_city=city)

@main.get('/profesional/<int:professional_id>')
def professional(professional_id):
    try:
        rows = rest('professionals', {'select': 'id,display_name,city,neighborhood,description,experience_years,rating,total_reviews,verified,category_id', 'id': f'eq.{professional_id}', 'status': 'eq.approved', 'limit': '1'})
        cats = rest('categories', {'select': 'id,name', 'is_active': 'eq.true'})
    except SupabaseError:
        rows, cats = [], []
    if not rows:
        abort(404)
    p = rows[0]
    p['category'] = next((c['name'] for c in cats if c['id'] == p['category_id']), 'Servicio')
    return render_template('profile.html', p=p)

@main.get('/cuenta')
def account():
    return render_template('account.html')

@main.get('/registrar')
def register():
    try:
        categories = rest('categories', {'select': 'id,name', 'is_active': 'eq.true', 'order': 'name.asc'})
    except SupabaseError:
        categories = []
    return render_template('register.html', categories=categories)

@main.get('/solicitar/<int:professional_id>')
def request_service(professional_id):
    try:
        rows = rest('professionals', {'select': 'id,display_name,city,neighborhood,description,experience_years,rating,total_reviews,verified,category_id', 'id': f'eq.{professional_id}', 'status': 'eq.approved', 'limit': '1'})
        cats = rest('categories', {'select': 'id,name', 'is_active': 'eq.true'})
    except SupabaseError:
        rows, cats = [], []
    if not rows:
        abort(404)
    p = rows[0]
    p['category'] = next((c['name'] for c in cats if c['id'] == p['category_id']), 'Servicio')
    return render_template('request.html', p=p)

@main.get('/solicitud/<int:request_id>/chat')
def chat(request_id):
    return render_template('chat.html', request_id=request_id)

@main.get('/health')
def health():
    return jsonify({'status': 'ok', 'service': 'tumarana-api'})

@csrf.exempt
@main.post('/api/professionals')
def api_professional_create():
    token, user = require_user()
    d = request.get_json(silent=True) or {}
    try:
        category_id = int(d.get('category_id'))
        experience = max(0, min(int(d.get('experience_years', 0)), 80))
    except (TypeError, ValueError):
        return jsonify({'error': 'category_id y experience_years deben ser numéricos'}), 400
    city = str(d.get('city', '')).strip()[:100]
    description = str(d.get('description', '')).strip()[:3000]
    if not city or not description:
        return jsonify({'error': 'Faltan campos obligatorios'}), 400
    try:
        name = str(d.get('display_name') or user.get('user_metadata', {}).get('full_name') or user.get('email', 'Usuario')).strip()[:150]
        result = rpc('create_professional_profile', {
            'p_display_name': name,
            'p_category_id': category_id,
            'p_city': city,
            'p_neighborhood': str(d.get('neighborhood', '')).strip()[:100],
            'p_description': description,
            'p_experience_years': experience,
        }, token)
        return jsonify(result), 201
    except SupabaseError as e:
        return api_error(e)

@csrf.exempt
@main.post('/api/requests')
def api_request_create():
    token, user = require_user()
    d = request.get_json(silent=True) or {}
    try:
        professional_id = int(d.get('professional_id'))
    except (TypeError, ValueError):
        return jsonify({'error': 'professional_id inválido'}), 400
    title = str(d.get('service_title', '')).strip()[:200]
    description = str(d.get('description', '')).strip()[:5000]
    if not title or not description:
        return jsonify({'error': 'Faltan campos obligatorios'}), 400
    try:
        rows = rest('service_requests', method='POST', data={
            'customer_id': user['id'],
            'professional_id': professional_id,
            'service_title': title,
            'description': description,
            'city': str(d.get('city', '')).strip()[:100],
            'address': str(d.get('address', '')).strip()[:250],
            'preferred_date': d.get('preferred_date') or None,
        }, token=token, prefer='return=representation')
        return jsonify(rows[0]), 201
    except SupabaseError as e:
        return api_error(e)

@main.get('/api/requests/<int:request_id>')
def api_request_get(request_id):
    token, user = require_user()
    try:
        rows = rest('service_requests', {'select': 'id,customer_id,professional_id,service_title,description,city,address,preferred_date,status,created_at,updated_at', 'id': f'eq.{request_id}', 'limit': '1'}, token=token)
        if not rows:
            return jsonify({'error': 'Solicitud no encontrada'}), 404
        req = rows[0]
        pros = rest('professionals', {'select': 'id,user_id,display_name', 'id': f'eq.{req["professional_id"]}', 'limit': '1'}, token=token)
        if not pros:
            return jsonify({'error': 'Profesional no encontrado'}), 404
        if req['customer_id'] != user['id'] and pros[0]['user_id'] != user['id']:
            return jsonify({'error': 'No autorizado'}), 403
        msgs = rest('messages', {'select': 'id,request_id,sender_id,body,is_read,created_at', 'request_id': f'eq.{request_id}', 'order': 'created_at.asc'}, token=token)
        req['professional'] = {'id': pros[0]['id'], 'display_name': pros[0]['display_name']}
        req['messages'] = msgs
        return jsonify(req)
    except SupabaseError as e:
        return api_error(e)

@csrf.exempt
@main.post('/api/requests/<int:request_id>/messages')
def api_message(request_id):
    token, _ = require_user()
    d = request.get_json(silent=True) or {}
    body = str(d.get('body', '')).strip()[:3000]
    if not body:
        return jsonify({'error': 'Mensaje obligatorio'}), 400
    try:
        rows = rest('messages', method='POST', data={'request_id': request_id, 'sender_id': auth_user(token)['id'], 'body': body}, token=token, prefer='return=representation')
        return jsonify(rows[0]), 201
    except SupabaseError as e:
        return api_error(e)

@csrf.exempt
@main.post('/api/admin/professionals/<int:professional_id>/approve')
def admin_approve(professional_id):
    token, user = require_user()
    try:
        profs = rest('profiles', {'select': 'role', 'id': f'eq.{user["id"]}', 'limit': '1'}, token=token)
        if not profs or profs[0]['role'] != 'admin':
            return jsonify({'error': 'No autorizado'}), 403
        rows = rest('professionals', {'id': f'eq.{professional_id}'}, method='PATCH', data={'status': 'approved', 'verified': True}, token=token, prefer='return=representation')
        return jsonify(rows[0] if rows else {}), 200
    except SupabaseError as e:
        return api_error(e)
