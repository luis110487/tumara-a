from flask import Blueprint, request, jsonify, abort
from .supabase_client import rest, rpc, auth_user, SupabaseError

main = Blueprint('main', __name__)

PROFESSIONAL_FIELDS = 'id,display_name,city,neighborhood,description,experience_years,rating,total_reviews,verified,category_id,whatsapp'
REQUEST_FIELDS = 'id,professional_id,customer_id,service_title,description,city,address,preferred_date,status,created_at,updated_at'
VALID_STATUSES = {'requested', 'in_conversation', 'quoted', 'accepted', 'in_progress', 'completed', 'cancelled'}


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


def with_categories(pros):
    try:
        cats = rest('categories', {'select': 'id,name', 'is_active': 'eq.true'})
    except SupabaseError:
        cats = []
    catmap = {c['id']: c['name'] for c in cats}
    for p in pros:
        p['category'] = catmap.get(p['category_id'], 'Servicio')
    return pros


@main.get('/health')
def health():
    return jsonify({'status': 'ok', 'service': 'tumarana-api'})


@main.get('/api/categories')
def api_categories():
    try:
        categories = rest('categories', {'select': 'id,name,slug,icon,description', 'is_active': 'eq.true', 'order': 'name.asc'})
    except SupabaseError:
        categories = []
    return jsonify(categories)


@main.get('/api/professionals')
def api_professionals_list():
    q = request.args.get('q', '').strip()[:100]
    city = request.args.get('city', '').strip()[:100]
    cat = request.args.get('category', '').strip()
    limit = request.args.get('limit', '').strip()
    params = {'select': PROFESSIONAL_FIELDS, 'status': 'eq.approved', 'order': 'verified.desc,rating.desc'}
    if city:
        params['city'] = f'eq.{city}'
    if limit.isdigit():
        params['limit'] = limit
    try:
        pros = rest('professionals', params)
    except SupabaseError:
        pros = []
    pros = with_categories(pros)
    if cat.isdigit():
        pros = [p for p in pros if str(p['category_id']) == cat]
    if q:
        needle = q.lower()
        pros = [p for p in pros if needle in (p.get('display_name', '') + ' ' + p.get('description', '') + ' ' + p.get('category', '')).lower()]
    return jsonify(pros)


@main.get('/api/professionals/<int:professional_id>')
def api_professional_detail(professional_id):
    try:
        rows = rest('professionals', {'select': PROFESSIONAL_FIELDS, 'id': f'eq.{professional_id}', 'status': 'eq.approved', 'limit': '1'})
    except SupabaseError:
        rows = []
    if not rows:
        abort(404)
    rows = with_categories(rows)
    return jsonify(rows[0])


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
            'p_whatsapp': str(d.get('whatsapp', '')).strip()[:20] or None,
        }, token)
        return jsonify(result), 201
    except SupabaseError as e:
        return api_error(e)


@main.get('/api/requests/mine')
def api_requests_mine():
    token, user = require_user()
    try:
        mine_pro = rest('professionals', {'select': 'id', 'user_id': f'eq.{user["id"]}', 'limit': '1'}, token=token)
        pro_id = mine_pro[0]['id'] if mine_pro else None
        as_customer = rest('service_requests', {'select': REQUEST_FIELDS, 'customer_id': f'eq.{user["id"]}', 'order': 'updated_at.desc'}, token=token)
        as_professional = rest('service_requests', {'select': REQUEST_FIELDS, 'professional_id': f'eq.{pro_id}', 'order': 'updated_at.desc'}, token=token) if pro_id else []
        return jsonify({'as_customer': as_customer, 'as_professional': as_professional})
    except SupabaseError as e:
        return api_error(e)


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
        rows = rest('service_requests', {'select': REQUEST_FIELDS, 'id': f'eq.{request_id}', 'limit': '1'}, token=token)
        if not rows:
            return jsonify({'error': 'Solicitud no encontrada'}), 404
        req = rows[0]
        pros = rest('professionals', {'select': 'id,user_id,display_name', 'id': f'eq.{req["professional_id"]}', 'limit': '1'}, token=token)
        if not pros:
            return jsonify({'error': 'Profesional no encontrado'}), 404
        if req['customer_id'] != user['id'] and pros[0]['user_id'] != user['id']:
            return jsonify({'error': 'No autorizado'}), 403
        msgs = rest('messages', {'select': 'id,request_id,sender_id,body,is_read,created_at', 'request_id': f'eq.{request_id}', 'order': 'created_at.asc'}, token=token)
        req['professional'] = {'id': pros[0]['id'], 'display_name': pros[0]['display_name'], 'is_mine': pros[0]['user_id'] == user['id']}
        req['messages'] = msgs
        return jsonify(req)
    except SupabaseError as e:
        return api_error(e)


@main.patch('/api/requests/<int:request_id>/status')
def api_request_status(request_id):
    token, _ = require_user()
    d = request.get_json(silent=True) or {}
    status = d.get('status')
    if status not in VALID_STATUSES:
        return jsonify({'error': 'Estado inválido'}), 400
    try:
        rows = rest('service_requests', {'id': f'eq.{request_id}'}, method='PATCH', data={'status': status}, token=token, prefer='return=representation')
        if not rows:
            return jsonify({'error': 'No autorizado o solicitud inexistente'}), 404
        return jsonify(rows[0])
    except SupabaseError as e:
        return api_error(e)


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
