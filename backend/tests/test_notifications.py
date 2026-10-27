import sys,os,unittest
from pathlib import Path
from unittest.mock import patch,Mock
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from app import create_app
from app import push_delivery as push
from app import email_client as email

EVENT={'id':'e1','recipient_id':'u1','title':'TuMaraña','body':'Actualización','path':'/mis-solicitudes','attempts':1}
class DeliveryTests(unittest.TestCase):
 def test_no_config_never_claims(self):
  with patch.dict(os.environ,{},clear=True),patch.object(push.requests,'post') as post:
   self.assertFalse(push.dispatch_pending()['configured']);post.assert_not_called()
 def test_success_and_expired_tokens(self):
  for code,body,expected in [(200,{},'sent'),(404,{'error':{'details':[{'errorCode':'UNREGISTERED'}]}},'expired'),(400,{'error':{'details':[{'errorCode':'INVALID_ARGUMENT'}]}},'failed')]:
   response=Mock(ok=code==200,status_code=code);response.json.return_value=body
   with patch.object(push,'credentials',return_value=('project','token')),patch.object(push.requests,'post',return_value=response):self.assertEqual(push.send_to_device('device',EVENT),expected)
 def dispatch(self,devices,result='sent',receipts=None):
  records=[]
  def rest(table,params=None,method='GET',data=None,**kwargs):
   records.append((table,method,data))
   if table=='push_devices' and method=='GET':return devices
   if table=='push_receipts' and method=='GET':return receipts or []
   return []
  response=Mock();response.json.return_value=[EVENT]
  with patch.object(push,'configured',return_value=True),patch.object(push,'admin_headers',return_value=('https://test',{})),patch.object(push.requests,'post',return_value=response),patch.object(push,'rest_admin',side_effect=rest),patch.object(push,'send_to_device',return_value=result) as send:
   outcome=push.dispatch_pending();return outcome,records,send.call_count
 def test_queue_does_not_ack_without_devices(self):
  out,records,_=self.dispatch([]);self.assertEqual(out['failed'],1);self.assertEqual(records[-1][2]['status'],'pending')
 def test_success_records_receipt_and_ack(self):
  out,records,_=self.dispatch([{'installation_id':'i1','token':'d'}]);self.assertEqual(out['sent'],1);self.assertTrue(any(t=='push_receipts' and m=='POST' for t,m,d in records));self.assertEqual(records[-1][2]['status'],'sent')
 def test_receipt_prevents_duplicate_send(self):
  out,_,count=self.dispatch([{'installation_id':'i1','token':'d'}],receipts=[{'installation_id':'i1'}]);self.assertEqual(count,0);self.assertEqual(out['sent'],1)
 def test_rejected_delivery_stays_pending(self):
  out,records,_=self.dispatch([{'installation_id':'i1','token':'d'}],'failed');self.assertEqual(out['failed'],1);self.assertEqual(records[-1][2]['status'],'pending')
 def test_expired_token_is_disabled(self):
  _,records,_=self.dispatch([{'installation_id':'i1','token':'d'}],'expired');self.assertTrue(any(t=='push_devices' and d=={'enabled':False} for t,m,d in records))
class DeviceTests(unittest.TestCase):
 def setUp(self):self.client=create_app().test_client();self.user={'id':'11111111-1111-4111-8111-111111111111'};self.install='22222222-2222-4222-8222-222222222222'
 def test_authentication_required(self):self.assertEqual(self.client.post('/api/push/devices',json={}).status_code,401)
 def test_token_registration_uses_authenticated_owner(self):
  with patch('app.routes.require_user',return_value=('jwt',self.user)),patch('app.routes.rest_admin',side_effect=[[{'is_active':True}],[]]) as rest:
   response=self.client.post('/api/push/devices',json={'installationId':self.install,'token':'device-token','user_id':'attacker'})
   self.assertEqual(response.status_code,200);self.assertEqual(rest.call_args.kwargs['data']['user_id'],self.user['id'])
 def test_invalid_installation_rejected(self):
  with patch('app.routes.require_user',return_value=('jwt',self.user)):
   self.assertEqual(self.client.post('/api/push/devices',json={'installationId':'../other','token':'x'}).status_code,400)
 def test_logout_delete_is_owner_scoped(self):
  with patch('app.routes.require_user',return_value=('jwt',self.user)),patch('app.routes.rest_admin') as rest:
   self.assertEqual(self.client.delete('/api/push/devices',json={'installationId':self.install}).status_code,200);self.assertEqual(rest.call_args.args[1]['user_id'],'eq.'+self.user['id'])
 def test_inactive_account_cannot_register(self):
  with patch('app.routes.require_user',return_value=('jwt',self.user)),patch('app.routes.rest_admin',return_value=[{'is_active':False}]):
   self.assertEqual(self.client.post('/api/push/devices',json={'installationId':self.install,'token':'device-token'}).status_code,403)
class MailTests(unittest.TestCase):
 def test_missing_key_is_not_success(self):
  with patch.dict(os.environ,{},clear=True):self.assertFalse(email.send_email('person@example.test','test','test'))
 def test_provider_rejection_is_not_success(self):
  response=Mock(status_code=403);response.json.return_value={'name':'validation_error'}
  with patch.dict(os.environ,{'RESEND_API_KEY':'fake','RESEND_FROM_EMAIL':'info@techdatasync.com'}),patch.object(email.requests,'post',return_value=response):self.assertFalse(email.send_email('person@example.test','test','test'))
 def test_html_and_plain_text_and_user_escape(self):
  response=Mock(status_code=200)
  with patch.dict(os.environ,{'RESEND_API_KEY':'fake','RESEND_FROM_EMAIL':'info@techdatasync.com'}),patch.object(email.requests,'post',return_value=response) as post:
   self.assertTrue(email.send_new_message_email('person@example.test','<img src=x>','Sender','Service','<script>alert(1)</script>',1));payload=post.call_args.kwargs['json'];self.assertNotIn('<script>',payload['html']);self.assertIn('&lt;script&gt;',payload['html']);self.assertTrue(payload['text']);self.assertEqual(payload['from'],'info@techdatasync.com')
if __name__=='__main__':unittest.main(verbosity=2)
