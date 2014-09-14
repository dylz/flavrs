from datetime import datetime

from django.conf import settings

from provider.oauth2.models import AccessToken

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

def is_access_token_valid(access_token,user):
    """
    Check if the access token for this user is valid, and if it has expired
    yet or not.
    """

    try:
        obj = AccessToken.objects.get(token=access_token,user=user)
    except AccessToken.DoesNotExist:
        return False
    else:
        if obj.get_expire_delta() > 0:
            return True
        else:
            return False
