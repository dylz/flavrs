from django.conf.urls import patterns, url, include

from base.views import IndexView
from bookmarks.views import InitView, LinkAddView, TabAddView

urlpatterns = patterns('',
    url(r'^initialize/$', InitView.as_view(), name='init'),
    url(r'^tab/', include([
        url('r^add/', TabAddView.as_view(), name='add'),
    ],namespace='tab')),
    
    url(r'^link/', include([
        url('r^add/', LinkAddView.as_view(), name='add'),
    ],namespace='link')),
    
    # let the front-end deal with these urls
    url(r'^tab/(?P<tag>\w+)/$', IndexView.as_view(), name='tab'),
    url(r'^link/(?P<link>\w+)/$', IndexView.as_view(), name='link')
)