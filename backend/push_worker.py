"""Run as a persistent Render worker: python push_worker.py."""
import logging
import time
from dotenv import load_dotenv
load_dotenv()
from app.push_delivery import dispatch_pending, queue_due_reminders
logging.basicConfig(level=logging.INFO)
last_reminder_check=0.0
while True:
    try:
        now=time.monotonic()
        if now-last_reminder_check>=60:
            last_reminder_check=now
            try:
                queued=queue_due_reminders()
                if queued: logging.info('Service reminders checked candidates=%s',queued)
            except Exception as error:
                # A missing/new migration must not stop delivery of already queued pushes.
                logging.warning('Reminder scheduler failed: %s',type(error).__name__)
        result=dispatch_pending()
        if result.get('sent') or result.get('failed'): logging.info('Push batch sent=%s failed=%s',result['sent'],result['failed'])
    except Exception as error:
        logging.warning('Push dispatcher failed: %s',type(error).__name__)
    time.sleep(3)
