from django.conf.urls import patterns, include, url

from django.contrib import admin
from base.views import index, controllers
admin.autodiscover()

urlpatterns = patterns('',
    url(r'^admin/', include(admin.site.urls)),
    url(r'^oauth2/', include('provider.oauth2.urls', namespace = 'oauth2')),
    url(r'^controllers/(?P<module>\w+)/(?P<action>\w+)', controllers),
    url(r'^', index),
)
