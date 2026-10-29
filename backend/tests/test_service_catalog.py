import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from app import create_app
from app import service_catalog as sc
from app import routes
from app.supabase_client import SupabaseError

USER='11111111-1111-4111-8111-111111111111'
BASE={'title':'Instalación eléctrica','description':'Instalación y revisión del circuito.','price_type':'from','price_cop':'80000','duration':'2–4 horas','warranty':'30 días','materials':'Incluidos','includes':['Mano de obra'],'is_active':True,'photo_url':None}
class ValidationTests(unittest.TestCase):
 def test_valid_price_and_quote(self):
  self.assertEqual(sc.validate_service(BASE,USER)['price_cop'],80000)
  self.assertIsNone(sc.validate_service({**BASE,'price_type':'quote','price_cop':None},USER)['price_cop'])
 def test_invalid_prices(self):
  for value in [True,-1,'NaN','Infinity','1.001','10000000000']:
   with self.subTest(value=value),self.assertRaises(ValueError):sc.validate_service({**BASE,'price_cop':value},USER)
 def test_quote_cannot_hide_amount(self):
  with self.assertRaises(ValueError):sc.validate_service({**BASE,'price_type':'quote'},USER)
 def test_unknown_and_ownership_fields_rejected(self):
  for field in ['professional_id','user_id','service_snapshot','created_at']:
   with self.subTest(field=field),self.assertRaises(ValueError):sc.validate_service({**BASE,field:'other'},USER)
 def test_bad_includes_and_empty_text(self):
  for value in [[{}],[''],['a']*21,['x'*181],{}]:
   with self.subTest(value=value),self.assertRaises(ValueError):sc.validate_service({**BASE,'includes':value},USER)
  with self.assertRaises(ValueError):sc.validate_service({**BASE,'title':'  '},USER)
 def test_photo_must_belong_to_account_bucket(self):
  with patch.dict(os.environ,{'SUPABASE_URL':'https://example.supabase.co'}):
   own=f'https://example.supabase.co/storage/v1/object/public/service-photos/{USER}/photo.jpg'
   self.assertEqual(sc.validate_service({**BASE,'photo_url':own},USER)['photo_url'],own)
   for url in ['https://evil.test/a.jpg',own.replace(USER,'other'),own+'?x=1','javascript:alert(1)']:
    with self.subTest(url=url),self.assertRaises(ValueError):sc.validate_service({**BASE,'photo_url':url},USER)
 def test_toggle_partial_cannot_modify_identity(self):
  self.assertEqual(sc.validate_service({'is_active':False},USER,True),{'is_active':False})
  with self.assertRaises(ValueError):sc.validate_service({'client_id':'other'},USER,True)
 def test_partial_price_requires_both_fields(self):
  with self.assertRaises(ValueError):sc.validate_service({'price_cop':5},USER,True)

class ApiTests(unittest.TestCase):
 def setUp(self):self.client=create_app().test_client()
 def rest(self,table,params=None,method='GET',data=None,**kwargs):
  if table=='profiles':return [{'id':USER,'is_active':True}]
  if table=='professionals':return [{'id':7,'status':'approved'}]
  if method=='PATCH':return [{'id':8,**data}]
  if method=='POST':return [{'id':8,**data}]
  return []
 def test_auth_required(self):
  self.assertEqual(self.client.post('/api/professionals/mine/services',json=BASE).status_code,401)
 def test_owner_scoped_patch(self):
  with patch.object(sc,'require_user',return_value=('token',{'id':USER})),patch.object(sc,'rest',side_effect=self.rest) as rest:
   response=self.client.patch('/api/professionals/mine/services/8',json={'is_active':False})
   self.assertEqual(response.status_code,200)
   call=rest.call_args_list[-1]
   self.assertEqual(call.args[1],{'id':'eq.8','professional_id':'eq.7'})
   self.assertEqual(call.kwargs['token'],'token')
 def test_cannot_patch_another_owner_service(self):
  def rest(table,params=None,method='GET',**kwargs):return [] if method=='PATCH' else self.rest(table,params,method,**kwargs)
  with patch.object(sc,'require_user',return_value=('token',{'id':USER})),patch.object(sc,'rest',side_effect=rest):
   self.assertEqual(self.client.patch('/api/professionals/mine/services/900',json={'is_active':False}).status_code,404)
 def test_inactive_and_suspended_accounts_denied(self):
  for inactive in [True,False]:
   def rest(table,*args,**kwargs):return [{'id':USER,'is_active':not inactive}] if table=='profiles' else [{'id':7,'status':'suspended'}]
   with patch.object(sc,'require_user',return_value=('token',{'id':USER})),patch.object(sc,'rest',side_effect=rest):
    self.assertEqual(self.client.get('/api/professionals/mine/services').status_code,403)
 def test_public_reads_do_not_use_private_token(self):
  with patch.object(sc,'rest',return_value=[]) as rest:
   self.assertEqual(self.client.get('/api/professionals/7/services').status_code,200)
   self.assertNotIn('token',rest.call_args.kwargs)
   self.assertEqual(rest.call_args.args[1]['is_active'],'eq.true')
 def test_missing_service_is_unavailable(self):
  with patch.object(sc,'rest',return_value=[]):self.assertEqual(self.client.get('/api/services/8').status_code,404)
 def test_provider_error_does_not_leak(self):
  with patch.object(sc,'rest',side_effect=SupabaseError('secret database detail')):
   response=self.client.get('/api/services/8');self.assertEqual(response.status_code,503);self.assertNotIn('secret',response.get_data(as_text=True))
 def test_create_and_retry_are_idempotent(self):
  payload={**BASE,'client_id':'22222222-2222-4222-8222-222222222222'}
  normalized=sc.validate_service(BASE,USER)
  def rest(table,params=None,method='GET',**kwargs):
   if table=='professional_services':return [] if method=='POST' else [{'id':8,**normalized}]
   return self.rest(table,params,method,**kwargs)
  with patch.object(sc,'require_user',return_value=('token',{'id':USER})),patch.object(sc,'rest',side_effect=rest) as mocked:
   response=self.client.post('/api/professionals/mine/services',json=payload)
   self.assertEqual(response.status_code,200);self.assertEqual(response.json['id'],8)
   post=next(call for call in mocked.call_args_list if call.kwargs.get('method')=='POST')
   self.assertEqual(post.kwargs['data']['professional_id'],7)
   self.assertIn('ignore-duplicates',post.kwargs['prefer'])
 def test_request_ignores_client_snapshot_and_uses_catalog_title(self):
  def rest(table,params=None,method='GET',data=None,**kwargs):
   if table=='professional_services':return [{'id':8,'title':'Título real'}]
   if table=='service_requests':return [{'id':9,**data}]
   return []
  with patch.object(routes,'require_user',return_value=('token',{'id':USER})),patch.object(routes,'rest',side_effect=rest) as mocked,patch.object(routes,'in_background'):
   response=self.client.post('/api/requests',json={'professional_id':7,'service_id':8,'service_title':'Título manipulado','description':'Necesito revisar el circuito','service_snapshot':{'price_cop':1}})
   self.assertEqual(response.status_code,201)
   post=next(call for call in mocked.call_args_list if call.kwargs.get('method')=='POST')
   self.assertEqual(post.kwargs['data']['service_title'],'Título real');self.assertEqual(post.kwargs['data']['service_id'],8);self.assertNotIn('service_snapshot',post.kwargs['data'])
 def test_unavailable_service_cannot_be_requested(self):
  with patch.object(routes,'require_user',return_value=('token',{'id':USER})),patch.object(routes,'rest',return_value=[]) as rest:
   self.assertEqual(self.client.post('/api/requests',json={'professional_id':7,'service_id':8,'service_title':'Servicio','description':'Necesito ayuda'}).status_code,400)
   self.assertFalse(any(call.kwargs.get('method')=='POST' for call in rest.call_args_list))

if __name__=='__main__':unittest.main(verbosity=2)
