import os
import json
import importlib
from django.conf import settings
from django.http import HttpResponse, Http404, HttpResponseRedirect
from django.template import RequestContext
from django.template import Context, loader
from django.core.context_processors import csrf
from django.middleware.csrf import get_token
from django.contrib.auth import logout
from django.core.urlresolvers import reverse

def generic_view(request,module):
    
    """
    This is just a generic view to load the correct template.
    Since this project is front-end and JS heavy, most of the logic for
    retrieving data is commanded there instead of on the back-end.
    
    Use the `module` parameter to determine if a specific template needs to be loaded.
    Otherwise, use the index.html and have the JS take care of the rest.
    """
    
    templates = {
        'default': 'base/index.html',
        'index': 'base/index.html',
        'intro': 'base/intro.html',
        'login': 'login/index.html'
    }
    
    """
    If the user is not logged in but is requesting the index page, show the
    'intro' page (that explains what Flavrs is).
    We are going to switch the templates before they get rendered as having the
    front-end do it with via JavaScript is an unnecessary overhead.
    """
    authenticated = request.user.is_authenticated()
    if module == 'index' and not authenticated:
        # mark 'module' as 'intro' and carry on with the templating logic
        module = 'intro'
    print reverse('index')
    # If you are not logged in, then the only pages you can visit are the ones
    # specified in the templates dict. Otherwise, redirect to homepage.
    if module not in templates and not authenticated:
        # module is not in dict, meaning that is an actual module (bookmarks,events, etc)
        # and the user is not logged in.. make them go away
        return HttpResponseRedirect('/')
    
    # get template using the `module` parameter and the templates dictionary
    # use the 'default' key as the template catch-all
    template = templates.get(module,templates['default'])
    
    t = loader.get_template(template)
    c = RequestContext(request, {})
    
    #Set csrf token
    get_token(request)
    
    return HttpResponse(t.render(c))

def logout_view(request):
    # simply log the user out using the built-in Django functions
    logout(request)