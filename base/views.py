import os
import json
import importlib
from django.conf import settings
from django.http import HttpResponse, Http404
from django.template import RequestContext
from django.template import Context, loader
from django.core.context_processors import csrf

def index(request):
    t = loader.get_template('index.html')
    c = RequestContext(request, {})
    c.update(csrf(request))
    return HttpResponse(t.render(c))

def controllers(request,module,action):
    """
    
    This function decides what to do with the users request.
    All Ajax calls are seperated by module, then action.
    This design choice was made to help organize the project as it grows.

    So, use the module passed, and find the respective controllers module,
    then pass the action to its blackbox.

    """

    ignore = ['.git']
    for name in os.listdir(settings.BASE_DIR):
        if name not in ignore and os.path.isdir(settings.BASE_DIR+'/'+name):
            if os.path.isfile(settings.BASE_DIR+'/'+name+'/controllers.py'):
                controllers = importlib.import_module(name+".controllers")
                blackbox = getattr(controllers,'BlackBox',None)
                if blackbox:
                    return HttpResponse(
                        json.dumps(blackbox().open(request,action)),
                        content_type="application/json"
                    )

    """
    Controller Not Found! 404!
    """
    raise Http404