import os
from django.conf import settings
from django.conf.urls import patterns, include, url, static
from django.contrib import admin

from base.views import IndexView, LoginView, LogoutView

admin.autodiscover()

urls = [
    url(r'^admin/', include(admin.site.urls)),
    url(r'^oauth2/', include('provider.oauth2.urls', namespace = 'oauth2')),
    url(r'^logout/$', LogoutView.as_view(), name='logout'),
    url(r'^login/$', LoginView.as_view(), name='login'),
    url(r'^$', IndexView.as_view(), name='index'),
    
    url(r'^login/', include([
            
        ], namespace='login')
    )
]

# Add modules into the controllers root dynamically
ignore = ['.git']
for name in os.listdir(settings.BASE_DIR):
    if name not in ignore and os.path.isdir(settings.BASE_DIR+'/'+name):
        urls.append(url(r'^%s/$' % name, IndexView.as_view(), name=name))
        try:
            urls.append(url(r'^%s/' % name, include('%s.urls' % name, namespace=name)))
        except ImportError:
            # it is possible that the module may not have any urls
            pass

urlpatterns = patterns('',*urls)