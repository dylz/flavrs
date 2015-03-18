import os
from django.conf import settings
from django.conf.urls import patterns, include, url, static
from django.contrib import admin

from base.views import generic_view, logout_view

admin.autodiscover()

urls = [
    url(r'^admin/', include(admin.site.urls)),
    url(r'^oauth2/', include('provider.oauth2.urls', namespace = 'oauth2')),
    url(r'^logout/$', logout_view, name='logout'),
    url(r'^login/$', generic_view, {"module":"login"}, name='login'),
    url(r'^$', generic_view, {"module":"index"}, name='index')
]

# Add modules into the controllers root dynamically
ignore = ['.git']
for name in os.listdir(settings.BASE_DIR):
    if name not in ignore and os.path.isdir(settings.BASE_DIR+'/'+name):
        urls.append(url(r'^%s/' % name, generic_view, {"module":name}, name=name))
        try:
            urls.append(url(r'^controllers/', include('%s.urls' % name, namespace=name)))
        except ImportError:
            # it is possible that the module may not have any urls
            pass

urlpatterns = patterns('',*urls)