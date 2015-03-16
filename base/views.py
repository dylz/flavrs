import os
import json
import importlib
from django.conf import settings
from django.http import HttpResponse, Http404
from django.template import RequestContext
from django.template import Context, loader
from django.core.context_processors import csrf
from django.middleware.csrf import get_token

def index(request):
    t = loader.get_template('index.html')
    c = RequestContext(request, {})
    
    #Set csrf token
    get_token(request)
    
    return HttpResponse(t.render(c))