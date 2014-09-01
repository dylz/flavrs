from django.http import HttpResponse
from django.template import RequestContext
from django.template import Context, loader

def index(request):
    t = loader.get_template('index.html')
    c = RequestContext(request, {})
    return HttpResponse(t.render(c))