import hashlib
import random
from datetime import datetime

from django.conf import settings

def normalise_email(email):
    """
    The local part of an email address is case-sensitive, the domain part
    isn't.  This function lowercases the host and should be used in all email
    handling.
    """
    clean_email = email.strip()
    if '@' in clean_email:
        local, host = clean_email.split('@')
        return local + '@' + host.lower()
    return clean_email


def get_home_url():
    return settings.PROTOCAL+'://'+settings.DOMAIN
    

def generate_hash(hash_string):
        m = hashlib.md5() #define md5 lib
        m.update(hash_string)
        return m.hexdigest()

def generate_reference():
    """
    Create a random unique reference
    Do so, by md5'ing the time right now, then substring to 10 chars
    A check might be needed to make sure the generated reference is actually
    completely unique.

    Starting point is chosen at random
    """
    from base.models import Reference
    start = random.randrange(0,21)
    end = start+10
    reference = generate_hash(str(datetime.now()))[start:end]

    try:
        ref = Reference.objects.get(reference=reference)
        generate_reference()
    except Reference.DoesNotExist:
        ref = Reference(reference=reference)
        ref.save()
        return reference