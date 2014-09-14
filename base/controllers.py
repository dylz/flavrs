import ast

from django.core.urlresolvers import reverse
from django.contrib.auth import authenticate, login, logout

import requests
from auth_remember import remember_user
from provider.oauth2.views import AccessTokenView

from base.utils import get_home_url, is_access_token_valid
from .blackbox import Base

class BlackBox(Base):

    def __init__(self):


        self.actions = {
            'check_login': self._check_login,
            'login': self._login,
            'logout': self._logout
        }


    '''
    Module specific functions below here
    '''

    def _check_login(self):
        """
        Just checking if the user is logged in or not, and gets passed to the
        front end to determine the scope from there.
        """

        #No errors can happen here, it is just a boolean just
        logged = False
        user = self.request.user
        access_token = self.data.get('access_token',None)

        if user.is_authenticated() and is_access_token_valid(access_token,user):
            logged = True

        self._set_log({
            'status': 'success',
            'response': {
                'logged': logged 
            }
        })

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
        
        #Now, lets check if the user authenticated successfully.

        self._set_log({'status': 'error'})

        response = ast.literal_eval(r.text)
        if response.get('access_token',False):
            #Access token granted, lets log them in through Django so the 
            #session gets created properly.
            user = authenticate(username=self.data['username'],
                                    password=self.data['password'])
            if user is not None and user.is_active:
                if self.data.get('remember_me', None):
                   remember_user(self.request,user) 
                login(self.request,user)
                self._set_log({
                    'status': 'success',
                    'msg': 'Login Successful. Welcome!',
                    'response': response
                })
            else:
                self._set_log({
                    'level': 'validation',
                    'msg': 'Account No Longer Active.'
                })

        else:
            #Users login failed
            self._set_log({
                'level': 'validation',
                'msg': 'Login Credentials Were Incorrect.'
            })

        return response

    def _logout(self):
        """
        Log the user out.
        """
        logout(self.request)