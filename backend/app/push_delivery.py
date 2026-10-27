"""FCM HTTP v1 delivery. Credentials live only on the server, never in the APK."""
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
            info = json.loads(os.environ['FCM_SERVICE_ACCOUNT_JSON']) if os.environ.get('FCM_SERVICE_ACCOUNT_JSON') else json.load(open(os.environ['GOOGLE_APPLICATION_CREDENTIALS'], encoding='utf-8'))
            _credentials = service_account.Credentials.from_service_account_info(info, scopes=['https://www.googleapis.com/auth/firebase.messaging'])
        if not _credentials.valid:
            _credentials.refresh(Request())
        return _credentials.project_id, _credentials.token

def send_to_device(token, event):
    project, access_token = credentials()
    payload = {'message': {'token': token, 'notification': {'title': event['title'], 'body': event['body']},
      'data': {'path': event['path'], 'event_id': event['id']}, 'android': {'priority': 'high', 'ttl':'86400s',
      'notification': {'channel_id':'tumarana_activity','icon':'ic_stat_notification','tag':event['id']}}}}
    response = requests.post(f'https://fcm.googleapis.com/v1/projects/{project}/messages:send', headers={'Authorization':f'Bearer {access_token}'}, json=payload, timeout=20)
    if response.ok:
        return 'sent'
    try:
        details = response.json().get('error', {}).get('details', [])
        if any(item.get('errorCode') == 'UNREGISTERED' for item in details):
            return 'expired'
    except (ValueError, AttributeError):
        pass
    log.warning('FCM rejected delivery status=%s event=%s', response.status_code, event['id'])
    return 'failed'

def dispatch_pending(limit=25):
    if not configured():
        return {'configured':False,'sent':0,'failed':0}
    url, headers = admin_headers()
    response = requests.post(url+'/rest/v1/rpc/claim_push_outbox',headers=headers,json={'p_limit':limit},timeout=15)
    response.raise_for_status()
    sent = failed = 0
    for event in response.json():
        try:
            devices = rest_admin('push_devices', {'select':'installation_id,token','user_id':'eq.'+event['recipient_id'],'enabled':'eq.true'})
            failures = 0
            successes = 0
            receipts=rest_admin('push_receipts',{'select':'installation_id','event_id':'eq.'+event['id']})
            delivered={receipt['installation_id'] for receipt in receipts}
            for device in devices:
                if device['installation_id'] in delivered:
                    successes += 1
                    continue
                result = send_to_device(device['token'], event)
                if result == 'sent':
                    rest_admin('push_receipts',{'on_conflict':'event_id,installation_id'},method='POST',data={'event_id':event['id'],'installation_id':device['installation_id']},prefer='resolution=ignore-duplicates')
                    successes += 1
                elif result == 'expired': rest_admin('push_devices', {'installation_id':'eq.'+device['installation_id']}, method='PATCH',data={'enabled':False})
                else: failures += 1
            if failures or not successes:
                raise RuntimeError('delivery_failed' if failures else 'no_registered_device')
            rest_admin('push_outbox', {'id':'eq.'+event['id']},method='PATCH',data={'status':'sent','sent_at':dt.datetime.now(dt.timezone.utc).isoformat(),'last_error':None})
            sent += 1
        except Exception as error:
            # Do not log tokens, email addresses, message content or service account keys.
            failed += 1
            delay = min(3600, 30 * (2 ** min(event['attempts'],7)))
            rest_admin('push_outbox', {'id':'eq.'+event['id']},method='PATCH',data={'status':'failed' if event['attempts']>=10 else 'pending','available_at':(dt.datetime.now(dt.timezone.utc)+dt.timedelta(seconds=delay)).isoformat(),'last_error':type(error).__name__})
    return {'configured':True,'sent':sent,'failed':failed}
