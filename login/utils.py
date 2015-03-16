from provider.oauth2.models import AccessToken

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
