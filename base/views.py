import os
import json
import importlib
from django.conf import settings
from django.http import HttpResponse, Http404
from django.template import RequestContext
from django.template import Context, loader
from django.core.context_processors import csrf
from django.middleware.csrf import get_token

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
        'login': 'login/index.html'
    }
    
    # get template using the `module` parameter and the templates dictionary
    # use the 'default' key as the template catch-all
    template = templates.get(module,templates['default'])
    
    t = loader.get_template(template)
    c = RequestContext(request, {})
    
    #Set csrf token
    get_token(request)
    
    return HttpResponse(t.render(c))