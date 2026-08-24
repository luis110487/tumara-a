import re
import secrets
import string

from flask import Blueprint, request, jsonify, abort
from .supabase_client import rest, rpc, auth_user, auth_signup, auth_admin_set_password, SupabaseError

main = Blueprint('main', __name__)

PROFESSIONAL_FIELDS = 'id,display_name,city,neighborhood,description,experience_years,rating,total_reviews,verified,category_id,whatsapp,photo_url'
REQUEST_FIELDS = 'id,professional_id,customer_id,service_title,description,city,address,preferred_date,status,created_at,updated_at'
VALID_STATUSES = {'requested', 'in_conversation', 'quoted', 'accepted', 'in_progress', 'completed', 'cancelled'}
PROFESSIONAL_STATUSES = {'pending', 'approved', 'rejected', 'suspended'}
PROFESSIONAL_ACTIONS = {'approve': ('approved', True), 'reject': ('rejected', False), 'suspend': ('suspended', False)}


def bearer():
    value = request.headers.get('Authorization', '')
    return value[7:].strip() if value.startswith('Bearer ') else None


def require_user():
    token = bearer()
    user = auth_user(token) if token else None
    if not user:
        abort(401, description='Autenticación requerida')
    return token, user


def require_admin():
    token, user = require_user()
    try:
        profs = rest('profiles', {'select': 'role,is_active', 'id': f'eq.{user["id"]}', 'limit': '1'}, token=token)
    except SupabaseError as e:
        abort(500, description=str(e))
    if not profs or profs[0]['role'] != 'admin' or not profs[0].get('is_active', True):
        abort(403, description='No autorizado')
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


@main.get('/api/me')
def api_me():
    token, user = require_user()
    try:
        profs = rest('profiles', {'select': '*', 'id': f'eq.{user["id"]}', 'limit': '1'}, token=token)
    except SupabaseError as e:
        return api_error(e)
    if not profs:
        return jsonify({'error': 'Perfil no encontrado'}), 404
    return jsonify(profs[0])


@main.patch('/api/me')
def api_me_update():
    token, user = require_user()
    d = request.get_json(silent=True) or {}
    data = {}
    if 'full_name' in d:
        full_name = str(d.get('full_name', '')).strip()[:150]
        if not full_name:
            return jsonify({'error': 'El nombre no puede estar vacío'}), 400
        data['full_name'] = full_name
    if 'phone' in d:
        data['phone'] = str(d.get('phone', '')).strip()[:20] or None
    if not data:
        return jsonify({'error': 'Nada para actualizar'}), 400
    try:
        rows = rest('profiles', {'id': f'eq.{user["id"]}'}, method='PATCH', data=data, token=token, prefer='return=representation')
        if not rows:
            return jsonify({'error': 'Perfil no encontrado'}), 404
        return jsonify(rows[0])
    except SupabaseError as e:
        return api_error(e)


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


@main.get('/api/professionals/mine')
def api_professional_mine():
    token, user = require_user()
    try:
        rows = rest('professionals', {'select': PROFESSIONAL_FIELDS + ',status,created_at', 'user_id': f'eq.{user["id"]}', 'limit': '1'}, token=token)
    except SupabaseError as e:
        return api_error(e)
    if not rows:
        return jsonify({'error': 'No tienes un perfil profesional creado'}), 404
    rows = with_categories(rows)
    return jsonify(rows[0])


@main.patch('/api/professionals/mine')
def api_professional_mine_update():
    token, user = require_user()
    d = request.get_json(silent=True) or {}
    data = {}
    if 'display_name' in d:
        data['display_name'] = str(d.get('display_name', '')).strip()[:150]
    if 'category_id' in d:
        try:
            data['category_id'] = int(d.get('category_id'))
        except (TypeError, ValueError):
            return jsonify({'error': 'category_id debe ser numérico'}), 400
    if 'city' in d:
        city = str(d.get('city', '')).strip()[:100]
        if not city:
            return jsonify({'error': 'La ciudad no puede estar vacía'}), 400
        data['city'] = city
    if 'neighborhood' in d:
        data['neighborhood'] = str(d.get('neighborhood', '')).strip()[:100]
    if 'whatsapp' in d:
        data['whatsapp'] = str(d.get('whatsapp', '')).strip()[:20] or None
    if 'experience_years' in d:
        try:
            data['experience_years'] = max(0, min(int(d.get('experience_years', 0)), 80))
        except (TypeError, ValueError):
            return jsonify({'error': 'experience_years debe ser numérico'}), 400
    if 'description' in d:
        description = str(d.get('description', '')).strip()[:3000]
        if not description:
            return jsonify({'error': 'La descripción no puede estar vacía'}), 400
        data['description'] = description
    if 'photo_url' in d:
        photo_url = str(d.get('photo_url', '')).strip()[:500]
        if not photo_url:
            return jsonify({'error': 'La URL de la foto no puede estar vacía'}), 400
        data['photo_url'] = photo_url
    if not data:
        return jsonify({'error': 'Nada para actualizar'}), 400
    try:
        rows = rest('professionals', {'user_id': f'eq.{user["id"]}'}, method='PATCH', data=data, token=token, prefer='return=representation')
        if not rows:
            return jsonify({'error': 'No tienes un perfil profesional creado'}), 404
        return jsonify(rows[0])
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


@main.get('/api/admin/professionals')
def admin_list_professionals():
    token, _ = require_admin()
    status = request.args.get('status', 'pending').strip()
    params = {'select': PROFESSIONAL_FIELDS + ',user_id,status,created_at', 'order': 'created_at.desc'}
    if status != 'all':
        if status not in PROFESSIONAL_STATUSES:
            return jsonify({'error': 'Estado inválido'}), 400
        params['status'] = f'eq.{status}'
    try:
        return jsonify(with_categories(rest('professionals', params, token=token)))
    except SupabaseError as e:
        return api_error(e)


@main.post('/api/admin/professionals/<int:professional_id>/<action>')
def admin_set_professional_status(professional_id, action):
    token, _ = require_admin()
    if action not in PROFESSIONAL_ACTIONS:
        return jsonify({'error': 'Acción inválida'}), 400
    status, verified = PROFESSIONAL_ACTIONS[action]
    try:
        rows = rest('professionals', {'id': f'eq.{professional_id}'}, method='PATCH', data={'status': status, 'verified': verified}, token=token, prefer='return=representation')
        if not rows:
            return jsonify({'error': 'Profesional no encontrado'}), 404
        return jsonify(rows[0])
    except SupabaseError as e:
        return api_error(e)


@main.get('/api/admin/categories')
def admin_list_categories():
    token, _ = require_admin()
    try:
        return jsonify(rest('categories', {'select': '*', 'order': 'name.asc'}, token=token))
    except SupabaseError as e:
        return api_error(e)


@main.post('/api/admin/categories')
def admin_create_category():
    token, _ = require_admin()
    d = request.get_json(silent=True) or {}
    name = str(d.get('name', '')).strip()[:100]
    slug = str(d.get('slug', '')).strip()[:100]
    if not name or not slug or not re.match(r'^[a-z0-9-]+$', slug):
        return jsonify({'error': 'name y slug (letras minúsculas, números y guiones) son obligatorios'}), 400
    try:
        rows = rest('categories', method='POST', data={
            'name': name,
            'slug': slug,
            'icon': str(d.get('icon', '')).strip()[:50] or None,
            'description': str(d.get('description', '')).strip()[:500] or None,
            'is_active': bool(d.get('is_active', True)),
        }, token=token, prefer='return=representation')
        return jsonify(rows[0]), 201
    except SupabaseError as e:
        return api_error(e)


@main.patch('/api/admin/categories/<int:category_id>')
def admin_update_category(category_id):
    token, _ = require_admin()
    d = request.get_json(silent=True) or {}
    data = {}
    if 'name' in d:
        data['name'] = str(d.get('name', '')).strip()[:100]
    if 'slug' in d:
        slug = str(d.get('slug', '')).strip()[:100]
        if not re.match(r'^[a-z0-9-]+$', slug):
            return jsonify({'error': 'slug inválido'}), 400
        data['slug'] = slug
    if 'icon' in d:
        data['icon'] = str(d.get('icon', '')).strip()[:50] or None
    if 'description' in d:
        data['description'] = str(d.get('description', '')).strip()[:500] or None
    if 'is_active' in d:
        data['is_active'] = bool(d.get('is_active'))
    if not data:
        return jsonify({'error': 'Nada para actualizar'}), 400
    try:
        rows = rest('categories', {'id': f'eq.{category_id}'}, method='PATCH', data=data, token=token, prefer='return=representation')
        if not rows:
            return jsonify({'error': 'Categoría no encontrada'}), 404
        return jsonify(rows[0])
    except SupabaseError as e:
        return api_error(e)


@main.get('/api/admin/requests')
def admin_list_requests():
    token, _ = require_admin()
    status = request.args.get('status', '').strip()
    params = {'select': REQUEST_FIELDS, 'order': 'updated_at.desc'}
    if status:
        if status not in VALID_STATUSES:
            return jsonify({'error': 'Estado inválido'}), 400
        params['status'] = f'eq.{status}'
    try:
        rows = rest('service_requests', params, token=token)
        pro_ids = list({r['professional_id'] for r in rows})
        pros = rest('professionals', {'select': 'id,display_name', 'id': f'in.({",".join(map(str, pro_ids))})'}, token=token) if pro_ids else []
        promap = {p['id']: p['display_name'] for p in pros}
        for r in rows:
            r['professional_name'] = promap.get(r['professional_id'], '—')
        return jsonify(rows)
    except SupabaseError as e:
        return api_error(e)


@main.get('/api/admin/users')
def admin_list_users():
    token, _ = require_admin()
    role = request.args.get('role', '').strip()
    q = request.args.get('q', '').strip()[:100]
    params = {'select': 'id,full_name,phone,role,is_active,created_at', 'order': 'created_at.desc'}
    if role:
        if role not in {'customer', 'professional', 'admin'}:
            return jsonify({'error': 'Rol inválido'}), 400
        params['role'] = f'eq.{role}'
    if q:
        params['full_name'] = f'ilike.*{q}*'
    try:
        return jsonify(rest('profiles', params, token=token))
    except SupabaseError as e:
        return api_error(e)


@main.patch('/api/admin/users/<uuid:user_id>/active')
def admin_set_user_active(user_id):
    token, _ = require_admin()
    d = request.get_json(silent=True) or {}
    if 'is_active' not in d:
        return jsonify({'error': 'is_active es obligatorio'}), 400
    try:
        rows = rest('profiles', {'id': f'eq.{user_id}'}, method='PATCH', data={'is_active': bool(d.get('is_active'))}, token=token, prefer='return=representation')
        if not rows:
            return jsonify({'error': 'Usuario no encontrado'}), 404
        return jsonify(rows[0])
    except SupabaseError as e:
        return api_error(e)


@main.patch('/api/admin/users/<uuid:user_id>')
def admin_update_user(user_id):
    token, _ = require_admin()
    d = request.get_json(silent=True) or {}
    data = {}
    if 'full_name' in d:
        data['full_name'] = str(d.get('full_name', '')).strip()[:150]
    if 'phone' in d:
        data['phone'] = str(d.get('phone', '')).strip()[:20] or None
    if 'role' in d:
        role = str(d.get('role', '')).strip()
        if role not in {'customer', 'professional', 'admin'}:
            return jsonify({'error': 'Rol inválido'}), 400
        data['role'] = role
    if 'is_active' in d:
        data['is_active'] = bool(d.get('is_active'))
    if not data:
        return jsonify({'error': 'Nada para actualizar'}), 400
    try:
        rows = rest('profiles', {'id': f'eq.{user_id}'}, method='PATCH', data=data, token=token, prefer='return=representation')
        if not rows:
            return jsonify({'error': 'Usuario no encontrado'}), 404
        return jsonify(rows[0])
    except SupabaseError as e:
        return api_error(e)


@main.post('/api/admin/users/<uuid:user_id>/reset-password')
def admin_reset_user_password(user_id):
    require_admin()
    alphabet = string.ascii_letters + string.digits
    new_password = ''.join(secrets.choice(alphabet) for _ in range(12))
    try:
        auth_admin_set_password(str(user_id), new_password)
    except SupabaseError as e:
        return api_error(e)
    return jsonify({'new_password': new_password})


@main.post('/api/admin/users/create-admin')
def admin_create_admin_user():
    token, _ = require_admin()
    d = request.get_json(silent=True) or {}
    full_name = str(d.get('full_name', '')).strip()[:150]
    email = str(d.get('email', '')).strip().lower()[:200]
    password = str(d.get('password', ''))
    if not full_name or not email or '@' not in email:
        return jsonify({'error': 'Nombre y email válidos son obligatorios'}), 400
    if len(password) < 8:
        return jsonify({'error': 'La contraseña debe tener al menos 8 caracteres'}), 400
    try:
        auth_signup(email, password, full_name)
    except SupabaseError as e:
        return api_error(e)
    try:
        result = rpc('promote_to_admin', {'p_email': email}, token)
        return jsonify(result), 201
    except SupabaseError as e:
        return jsonify({'warning': 'La cuenta se creó pero no se pudo promover a admin automáticamente', 'detail': str(e)}), 207


@main.post('/api/admin/users/promote')
def admin_promote_user():
    token, _ = require_admin()
    d = request.get_json(silent=True) or {}
    email = str(d.get('email', '')).strip().lower()[:200]
    if not email or '@' not in email:
        return jsonify({'error': 'Email inválido'}), 400
    try:
        result = rpc('promote_to_admin', {'p_email': email}, token)
        return jsonify(result)
    except SupabaseError as e:
        if 'user not found' in str(e).lower():
            return jsonify({'error': 'No existe un usuario con ese correo'}), 404
        return api_error(e)


@main.get('/api/banners')
def api_banners():
    try:
        banners = rest('banners', {'select': 'id,title,image_url,link,is_active', 'is_active': 'eq.true', 'order': 'position.asc'})
        return jsonify(banners)
    except SupabaseError:
        return jsonify([])


@main.get('/api/admin/banners')
def admin_list_banners():
    token, _ = require_admin()
    try:
        banners = rest('banners', {'select': '*', 'order': 'position.asc'}, token=token)
        return jsonify(banners)
    except SupabaseError as e:
        return api_error(e)


@main.post('/api/admin/banners')
def admin_create_banner():
    token, _ = require_admin()
    d = request.get_json(silent=True) or {}
    image_url = str(d.get('image_url', '')).strip()[:500]
    if not image_url:
        return jsonify({'error': 'URL de imagen es obligatoria'}), 400
    try:
        rows = rest('banners', method='POST', data={
            'title': str(d.get('title', '')).strip()[:200] or None,
            'image_url': image_url,
            'link': str(d.get('link', '')).strip()[:500] or None,
            'position': int(d.get('position', 0)),
            'is_active': bool(d.get('is_active', True)),
        }, token=token, prefer='return=representation')
        return jsonify(rows[0]), 201
    except SupabaseError as e:
        return api_error(e)


@main.patch('/api/admin/banners/<int:banner_id>')
def admin_update_banner(banner_id):
    token, _ = require_admin()
    d = request.get_json(silent=True) or {}
    data = {}
    if 'title' in d:
        data['title'] = str(d.get('title', '')).strip()[:200] or None
    if 'image_url' in d:
        image_url = str(d.get('image_url', '')).strip()[:500]
        if not image_url:
            return jsonify({'error': 'URL de imagen no puede estar vacía'}), 400
        data['image_url'] = image_url
    if 'link' in d:
        data['link'] = str(d.get('link', '')).strip()[:500] or None
    if 'position' in d:
        data['position'] = int(d.get('position', 0))
    if 'is_active' in d:
        data['is_active'] = bool(d.get('is_active'))
    if not data:
        return jsonify({'error': 'Nada para actualizar'}), 400
    try:
        rows = rest('banners', {'id': f'eq.{banner_id}'}, method='PATCH', data=data, token=token, prefer='return=representation')
        if not rows:
            return jsonify({'error': 'Banner no encontrado'}), 404
        return jsonify(rows[0])
    except SupabaseError as e:
        return api_error(e)


@main.delete('/api/admin/banners/<int:banner_id>')
def admin_delete_banner(banner_id):
    token, _ = require_admin()
    try:
        rest('banners', {'id': f'eq.{banner_id}'}, method='DELETE', token=token)
        return jsonify({'ok': True}), 204
    except SupabaseError as e:
        return api_error(e)
