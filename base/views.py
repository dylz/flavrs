from django.conf import settings
from django.http import HttpResponse, Http404, HttpResponseRedirect
from django.core.context_processors import csrf
from django.contrib.auth import logout
from django.core.urlresolvers import reverse, reverse_lazy
from django.views.generic import TemplateView, RedirectView, FormView
from django.contrib.auth.forms import AuthenticationForm

from base.auth import Auth
from base.mixins import AjaxResponseMixin

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


class LoginView(AjaxResponseMixin,FormView):
    template_name = 'login/index.html'
    form_class = AuthenticationForm
    
class LogoutView(RedirectView):
    url = reverse_lazy('index')
    permanent = False

    def get(self, request, *args, **kwargs):
        logout(request)
        response = super(LogoutView, self).get(request, *args, **kwargs)
        return response