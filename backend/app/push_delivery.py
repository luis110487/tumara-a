"""FCM HTTP v1 delivery with account-bound data payloads and renewable queue leases."""
import datetime as dt
import json
import logging
import os
import threading
import requests
from .supabase_client import rest_admin, admin_headers
log = logging.getLogger(__name__)
_lock = threading.Lock()
_credentials = None


def configured():
    return bool(os.environ.get('FCM_SERVICE_ACCOUNT_JSON') or os.environ.get('GOOGLE_APPLICATION_CREDENTIALS'))


def credentials():
    global _credentials
    from google.oauth2 import service_account
    from google.auth.transport.requests import Request
    with _lock:
        if _credentials is None:
            if os.environ.get('FCM_SERVICE_ACCOUNT_JSON'):
                info=json.loads(os.environ['FCM_SERVICE_ACCOUNT_JSON'])
            else:
                with open(os.environ['GOOGLE_APPLICATION_CREDENTIALS'],encoding='utf-8') as source:info=json.load(source)
            _credentials=service_account.Credentials.from_service_account_info(info,scopes=['https://www.googleapis.com/auth/firebase.messaging'])
        if not _credentials.valid:_credentials.refresh(Request())
        return _credentials.project_id,_credentials.token


def send_to_device(token,event,platform='android'):
    project,access_token=credentials()
    data={key:str(event[key]) for key in ('title','body','path')}
    data.update({'event_id':str(event['id']),'recipient_id':str(event['recipient_id'])})
    # Data-only avoids automatic background notifications bypassing the current account binding.
    message={'token':token,'data':data}
    if platform=='web':message['webpush']={'headers':{'Urgency':'high','TTL':'86400'}}
    else:message['android']={'priority':'high','ttl':'86400s'}
    response=requests.post(f'https://fcm.googleapis.com/v1/projects/{project}/messages:send',headers={'Authorization':f'Bearer {access_token}'},json={'message':message},timeout=20)
    if response.ok:return 'sent'
    try:
        details=response.json().get('error',{}).get('details',[])
        if any(item.get('errorCode')=='UNREGISTERED' for item in details):return 'expired'
    except (ValueError,AttributeError):pass
    log.warning('FCM rejected delivery status=%s event=%s',response.status_code,event['id'])
    return 'failed'


def dispatch_pending(limit=25):
    if not configured():return {'configured':False,'sent':0,'failed':0}
    url,headers=admin_headers()
    sent=failed=0
    for _ in range(max(1,min(limit,100))):
        response=requests.post(url+'/rest/v1/rpc/claim_push_outbox',headers=headers,json={'p_limit':1},timeout=15)
        response.raise_for_status()
        claimed=response.json()
        if not claimed:break
        event=claimed[0]
        lease={'id':'eq.'+str(event['id']),'claim_token':'eq.'+str(event['claim_token']),'status':'eq.processing'}
        def renew():
            rows=rest_admin('push_outbox',lease,method='PATCH',data={'locked_at':dt.datetime.now(dt.timezone.utc).isoformat()},prefer='return=representation')
            if not rows:raise RuntimeError('lease_lost')
        try:
            renew()
            profile=rest_admin('profiles',{'select':'is_active','id':'eq.'+event['recipient_id'],'limit':'1'})
            if not profile or not profile[0].get('is_active',False):
                rest_admin('push_outbox',lease,method='PATCH',data={'status':'failed','last_error':'inactive_recipient'})
                failed+=1
                continue
            devices=rest_admin('push_devices',{'select':'installation_id,token,platform','user_id':'eq.'+event['recipient_id'],'enabled':'eq.true'})
            receipts=rest_admin('push_receipts',{'select':'installation_id','event_id':'eq.'+event['id']})
            delivered={receipt['installation_id'] for receipt in receipts}
            failures=successes=0
            for device in devices:
                renew()
                if device['installation_id'] in delivered:
                    successes+=1
                    continue
                result=send_to_device(device['token'],event,device.get('platform','android'))
                if result=='sent':
                    rest_admin('push_receipts',{'on_conflict':'event_id,installation_id'},method='POST',data={'event_id':event['id'],'installation_id':device['installation_id']},prefer='resolution=ignore-duplicates')
                    successes+=1
                elif result=='expired':rest_admin('push_devices',{'installation_id':'eq.'+device['installation_id'],'token':'eq.'+device['token']},method='PATCH',data={'enabled':False})
                else:failures+=1
            if failures or not successes:raise RuntimeError('delivery_unavailable')
            renew()
            rest_admin('push_outbox',lease,method='PATCH',data={'status':'sent','sent_at':dt.datetime.now(dt.timezone.utc).isoformat(),'last_error':None})
            sent+=1
        except Exception as error:
            failed+=1
            delay=min(3600,30*(2**min(event['attempts'],7)))
            # Only this lease owner can update the event; no credentials or recipient data are logged.
            rest_admin('push_outbox',lease,method='PATCH',data={'status':'failed' if event['attempts']>=10 else 'pending','available_at':(dt.datetime.now(dt.timezone.utc)+dt.timedelta(seconds=delay)).isoformat(),'last_error':type(error).__name__})
    return {'configured':True,'sent':sent,'failed':failed}
