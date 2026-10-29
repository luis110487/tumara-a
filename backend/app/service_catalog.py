"""Owner-scoped service catalog. Public reads use anonymous RLS, never admin keys."""
import os
import re
from decimal import Decimal, InvalidOperation
from uuid import UUID
from urllib.parse import urlparse
from flask import Blueprint, request, jsonify, abort
from .routes import require_user, with_categories, PROFESSIONAL_FIELDS
from .supabase_client import rest, SupabaseError

catalog = Blueprint('service_catalog', __name__)
FIELDS = 'id,professional_id,title,description,photo_url,price_type,price_cop,duration,warranty,materials,includes,is_active,created_at,updated_at'
EDITABLE = {'title','description','photo_url','price_type','price_cop','duration','warranty','materials','includes','is_active'}


def validate_service(data, user_id, partial=False):
    if not isinstance(data, dict) or set(data) - EDITABLE - ({'client_id'} if not partial else set()):
        raise ValueError('Campos del servicio inválidos.')
    result = {}
    for key, limit in [('title',200),('description',5000),('duration',100),('warranty',250),('materials',250)]:
        if partial and key not in data: continue
        value = data.get(key)
        if value is not None and not isinstance(value,str): raise ValueError('Los textos del servicio son inválidos.')
        value = (value or '').strip()
        if len(value)>limit or (key in ('title','description') and not value): raise ValueError(f'Completa {key} sin exceder {limit} caracteres.')
        result[key] = value or None
    if 'photo_url' in data or not partial:
        photo = data.get('photo_url') or None
        if photo is not None:
            if not isinstance(photo,str) or len(photo)>1000: raise ValueError('Foto inválida.')
            base = os.environ.get('SUPABASE_URL','').rstrip('/')
            prefix = f'{base}/storage/v1/object/public/service-photos/{user_id}/'
            parsed = urlparse(photo)
            if not base or not photo.startswith(prefix) or parsed.scheme!='https' or parsed.query or parsed.fragment or not photo[len(prefix):] or '/' in photo[len(prefix):] or '..' in photo[len(prefix):]:
                raise ValueError('La foto debe subirse al almacenamiento de tu cuenta.')
        result['photo_url']=photo
    if 'price_type' in data or not partial:
        if data.get('price_type','quote') not in ('from','quote'): raise ValueError('Tipo de precio inválido.')
        result['price_type']=data.get('price_type','quote')
    if 'price_cop' in data or not partial:
        price=data.get('price_cop')
        if price is not None:
            if isinstance(price,bool): raise ValueError('Precio inválido.')
            try: amount=Decimal(str(price))
            except (InvalidOperation,TypeError,ValueError): raise ValueError('Precio inválido.')
            if not amount.is_finite() or amount<0 or amount>Decimal('9999999999.99') or amount.as_tuple().exponent < -2:
                raise ValueError('El precio debe ser positivo, con máximo dos decimales.')
            price=float(amount)
        result['price_cop']=price
    if not partial or 'price_type' in result or 'price_cop' in result:
        # Price type and amount must travel together on edits.
        if partial and not {'price_type','price_cop'}.issubset(data): raise ValueError('Envía el tipo de precio y el valor juntos.')
        if (result['price_type']=='quote' and result['price_cop'] is not None) or (result['price_type']=='from' and result['price_cop'] is None):
            raise ValueError('Indica un precio desde o selecciona A convenir.')
    if 'includes' in data or not partial:
        items=data.get('includes',[])
        if not isinstance(items,list) or len(items)>20 or any(not isinstance(item,str) or not item.strip() or len(item.strip())>180 for item in items):
            raise ValueError('Añade hasta 20 elementos de máximo 180 caracteres.')
        result['includes']=[item.strip() for item in items]
    if 'is_active' in data or not partial:
        active=data.get('is_active',True)
        if not isinstance(active,bool): raise ValueError('El estado del servicio es inválido.')
        result['is_active']=active
    if not result: raise ValueError('No hay cambios para guardar.')
    return result


def owner():
    token,user=require_user()
    profiles=rest('profiles',{'select':'id,is_active','id':f'eq.{user["id"]}','limit':'1'},token=token)
    if not profiles or not profiles[0].get('is_active'): abort(403,description='Tu cuenta no está activa.')
    rows=rest('professionals',{'select':'id,status','user_id':f'eq.{user["id"]}','limit':'1'},token=token)
    if not rows: abort(404,description='Primero registra tu perfil profesional.')
    if rows[0].get('status')=='suspended': abort(403,description='Tu perfil profesional está suspendido.')
    return token,user,rows[0]['id']


def unavailable():
    return jsonify({'error':'No pudimos consultar o guardar el catálogo. Intenta de nuevo.'}),503


@catalog.get('/api/professionals/<int:professional_id>/services')
def public_services(professional_id):
    try:
        rows=rest('professional_services',{'select':FIELDS,'professional_id':f'eq.{professional_id}','is_active':'eq.true','order':'created_at.desc'})
        # Anonymous RLS restricts approved, active accounts.
        return jsonify(rows)
    except SupabaseError: return unavailable()


@catalog.get('/api/services/<int:service_id>')
def public_service(service_id):
    try:
        rows=rest('professional_services',{'select':FIELDS,'id':f'eq.{service_id}','is_active':'eq.true','limit':'1'})
        if not rows: return jsonify({'error':'Este servicio ya no está disponible.'}),404
        service=rows[0]
        pros=rest('professionals',{'select':PROFESSIONAL_FIELDS,'id':f'eq.{service["professional_id"]}','status':'eq.approved','limit':'1'})
        if not pros: return jsonify({'error':'Este servicio ya no está disponible.'}),404
        service['professional']=with_categories(pros)[0]
        return jsonify(service)
    except SupabaseError: return unavailable()


@catalog.get('/api/professionals/mine/services')
def own_services():
    try:
        token,user,pro_id=owner()
        return jsonify(rest('professional_services',{'select':FIELDS,'professional_id':f'eq.{pro_id}','order':'updated_at.desc'},token=token))
    except SupabaseError: return unavailable()


@catalog.post('/api/professionals/mine/services')
def create_service():
    try:
        token,user,pro_id=owner()
        raw=request.get_json(silent=True)
        data=validate_service(raw,user['id'])
        try: client_id=str(UUID(str(raw.get('client_id'))))
        except (ValueError,TypeError,AttributeError): raise ValueError('Identificador de guardado inválido. Abre de nuevo el formulario.')
        payload={**data,'professional_id':pro_id,'client_id':client_id}
        rows=rest('professional_services',{'on_conflict':'professional_id,client_id'},method='POST',data=payload,token=token,prefer='resolution=ignore-duplicates,return=representation')
        if rows: return jsonify(rows[0]),201
        rows=rest('professional_services',{'select':FIELDS,'professional_id':f'eq.{pro_id}','client_id':f'eq.{client_id}','limit':'1'},token=token)
        if not rows: return unavailable()
        if any(rows[0].get(key)!=value for key,value in data.items()):
            return jsonify({'error':'Este servicio ya fue guardado con otros datos. Actualiza el catálogo y edítalo.'}),409
        return jsonify(rows[0])
    except ValueError as error: return jsonify({'error':str(error)}),400
    except SupabaseError: return unavailable()


@catalog.patch('/api/professionals/mine/services/<int:service_id>')
def edit_service(service_id):
    try:
        token,user,pro_id=owner()
        data=validate_service(request.get_json(silent=True),user['id'],partial=True)
        rows=rest('professional_services',{'id':f'eq.{service_id}','professional_id':f'eq.{pro_id}'},method='PATCH',data=data,token=token,prefer='return=representation')
        if not rows: return jsonify({'error':'Servicio no encontrado en tu catálogo.'}),404
        return jsonify(rows[0])
    except ValueError as error: return jsonify({'error':str(error)}),400
    except SupabaseError: return unavailable()
