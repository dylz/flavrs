from django.conf.urls import patterns, url, include

from base.views import IndexView
from bookmarks.views import InitView, LinkAddView, TabAddView

urlpatterns = patterns('',
    url(r'^initialize/$', InitView.as_view(), name='init'),
    url(r'^tab/', include([
        url(r'^add/', TabAddView.as_view(), name='add'),
    ],namespace='tab')),
    
    url(r'^link/', include([
        url(r'^add/', LinkAddView.as_view(), name='add'),
    ],namespace='link')),
    
    # let the front-end deal with these urls
    url(r'^tabs/(?P<tag>\w+)/$', IndexView.as_view(), name='tabs'),
    url(r'^tabs/add/$', IndexView.as_view(), name='tabs_index_add'),
    url(r'^tabs/edit/(?P<id>\w+)/$', IndexView.as_view(), name='tabs_index_edit'),
    url(r'^link/(?P<link>\w+)/$', IndexView.as_view(), name='link')
)