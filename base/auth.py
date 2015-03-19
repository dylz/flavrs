import ast
import requests

from django.contrib.auth.backends import ModelBackend
from django.core.mail import mail_admins
from django.core.exceptions import ImproperlyConfigured
from django.core.urlresolvers import reverse
from django.contrib.auth import authenticate, login, logout

from auth_remember import remember_user
from provider.oauth2.models import AccessToken

from base.utils import normalise_email, get_home_url
from base.compat import get_user_model

User = get_user_model()

if hasattr(User, 'REQUIRED_FIELDS'):
    if not (User.USERNAME_FIELD == 'email' or 'email' in User.REQUIRED_FIELDS):
        raise ImproperlyConfigured(
            "Emailbackend: Your User model must have an email"
            " field with blank=False")


class Emailbackend(ModelBackend):
    """
    Custom auth backend that uses an email address and password

    For this to work, the User model must have an 'email' field
    """

    def authenticate(self, email=None, password=None, *args, **kwargs):
        if email is None:
            if 'username' not in kwargs or kwargs['username'] is None:
                return None
            clean_email = normalise_email(kwargs['username'])
        else:
            clean_email = normalise_email(email)

        # Check if we're dealing with an email address
        if '@' not in clean_email:
            return None

        # Since Django doesn't enforce emails to be unique, we look for all
        # matching users and try to authenticate them all.  If we get more than
        # one success, then we mail admins as this is a problem.
        authenticated_users = []
        matching_users = User.objects.filter(email=clean_email)
        for user in matching_users:
            if user.check_password(password):
                authenticated_users.append(user)
        if len(authenticated_users) == 1:
            # Happy path
            return authenticated_users[0]
        elif len(authenticated_users) > 1:
            # This is the problem scenario where we have multiple users with
            # the same email address AND password.  We can't safely authentiate
            # either.  This situation requires intervention by an admin and so
            # we mail them to let them know!
            mail_admins(
                "There are multiple users with email address: %s"
                % clean_email,
                ("There are %s users with email %s and the same password "
                 "which means none of them are able to authenticate")
                % (len(authenticated_users), clean_email))
        return None

class Auth(object):
    
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
                
    def check_login(self):
        """
        Just checking if the user is logged in or not, and gets passed to the
        front end to determine the scope from there.
        """

        #No errors can happen here, it is just a boolean just
        logged = False
        user = self.request.user
        access_token = self.data.get('access_token',None)

        if user.is_authenticated() and self.is_access_token_valid(access_token,user):
            logged = True

        self._set_log({
            'status': 'success',
            'response': {
                'logged': logged 
            }
        })

    def login(self):
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

    def logout(self):
        """
        Log the user out.
        """
        logout(self.request)