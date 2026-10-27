"""Run as a persistent Render worker: python push_worker.py."""
import logging
import time
from dotenv import load_dotenv
load_dotenv()
from app.push_delivery import dispatch_pending
logging.basicConfig(level=logging.INFO)
while True:
    try:
        result=dispatch_pending()
        if result.get('sent') or result.get('failed'): logging.info('Push batch sent=%s failed=%s',result['sent'],result['failed'])
    except Exception as error:
        logging.warning('Push dispatcher failed: %s',type(error).__name__)
    time.sleep(15)
