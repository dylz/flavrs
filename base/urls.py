from django.conf import settings
from django.conf.urls import patterns, include, url, static

from django.contrib import admin
from base.views import index, module_view
admin.autodiscover()

urlpatterns = patterns('',
    url(r'^admin/', include(admin.site.urls)),
    url(r'^oauth2/', include('provider.oauth2.urls', namespace = 'oauth2')),
    url(r'^$', index),
    url(r'^(?P<module>\w+)/', module_view),
)

# Add modules into the controllers root dynamically
module_urls = []
ignore = ['.git']
for name in os.listdir(settings.BASE_DIR):
    if name not in ignore and os.path.isdir(settings.BASE_DIR+'/'+name):
        url(r'^%s/' % name, index),
        module_urls.append(url(r'^controllers', include('%s.urls' % name))


urlpatterns = module_urls + urlpatterns