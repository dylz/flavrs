from django.core.urlresolvers import reverse

import requests
from provider.oauth2.views import AccessTokenView

from base.utils import get_home_url
from .blackbox import Base

class BlackBox(Base):

    def __init__(self):


        self.actions = {
            'login': self._login
        }


    '''
    Module specific functions below here
    '''

    def _login(self):
        """
        Attempt to log a user in.
        Currently, Flavrs uses Oauth2 to do this process. The main reason for
        this decision was to easily allow outside API usage in the future without
        a refactor.

        The Django app responsible is:
        https://github.com/caffeinehit/django-oauth2-provider

        For integrity and security reasons, the decision was made not to use
        the default URLS provided from django-oauth2-provider directly and use
        a wrapper for them instead.

        The reason for this was to prevent having to write an exception outside
        of the Flavrs url schema.

        Lastly, until further testing of django-oauth2-provider views is done,
        a request from this function will be made directly to the proper oauth
        url. This method is slower, but more reliable.

        """

        url = get_home_url()+reverse('oauth2:access_token')
        r = requests.post(url,data=self.data)
        print r.text
        return r.text