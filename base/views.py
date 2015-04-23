from django.conf import settings
from django.http import HttpResponse, Http404, HttpResponseRedirect
from django.core.context_processors import csrf
from django.contrib.auth import logout
from django.core.urlresolvers import reverse, reverse_lazy
from django.views.generic import TemplateView, RedirectView, View
from django.contrib.auth import login
from django.contrib.auth.forms import AuthenticationForm

from base.utils import generate_hash
from base.mixins import AjaxResponseMixin, CustomViewMethodsMixin

class AjaxView(AjaxResponseMixin):
    # Shortcut for views with forms without needing a template
    template_name = 'base/index.html'
    success_url = '/'
    remove = False
    post_requires_authentication = True

class SystemView(View,CustomViewMethodsMixin):
    """
    No form or user input required therefore we can get away with
    the most simple view Django offers.
    
    No Ajax request with that required user input should use this view, it is
    mostly used for system checks.
    """
    
    def post(self, request, *args, **kwargs):
        if request.is_ajax():
            return self.json_response()
        else:
            return HttpResponseBadRequest()

# Actual views

class IndexView(TemplateView):
    
    template_name = 'base/landing.html'
    
    def get_template_names(self):
        # If the user is logged in, change the template to the main
        # application template and the front end take care of the rest
        
        if self.request.user.is_authenticated():
            self.template_name = 'base/index.html'
        
        return [self.template_name]
        
    def get_context_data(self, **kwargs):
        ctx = super(IndexView,self).get_context_data(**kwargs)
        ctx.update(csrf(self.request))
        return ctx
        
    def render_to_response(self, context, **response_kwargs):
        
        # If the user is not logged in, then we need to make sure they are
        # on the homepage(index) page.. if they are not, redirect them there
        request = self.request
        index_path = reverse_lazy('index')
        if not request.user.is_authenticated() and request.path != index_path:
            return HttpResponseRedirect(index_path)
        
        return super(IndexView,self).render_to_response(context, **response_kwargs)


class LoginView(AjaxResponseMixin):
    template_name = 'login/index.html'
    form_class = AuthenticationForm
    #success_url = reverse_lazy('index') # production url
    success_url = reverse_lazy('bookmarks') # test with bookmarks url
    
    def form_valid(self, form):
        # log the user in
        login(self.request,form.get_user())
        return super(LoginView,self).form_valid(form)
    
    def get_json_data(self):
        return {
            '_redirect_url': unicode(self.success_url)
        }
    
class LogoutView(RedirectView):
    url = reverse_lazy('index')
    permanent = False

    def get(self, request, *args, **kwargs):
        logout(request)
        response = super(LogoutView, self).get(request, *args, **kwargs)
        return response
        
class CurrentUserView(SystemView):
    
    def get_json_data(self):
        # Get the current user's information
        user = self.request.user
        
        # only return the min about of data - no not expose too much
        # user info for privacy reasons
        return {
            'id': user.profile.reference,
            'image': 'http://www.gravatar.com/avatar/%s' % generate_hash(user.email),
            'first_name': user.first_name,
            'last_name': user.last_name
        }