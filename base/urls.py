from django.conf.urls import patterns, include, url

from django.contrib import admin
from base.views import index
admin.autodiscover()

urlpatterns = patterns('',
    url(r'', index),
    url(r'^admin/', include(admin.site.urls)),
)
