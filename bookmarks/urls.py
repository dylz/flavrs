from django.conf.urls import patterns, url, include

from base.views import IndexView
from bookmarks.views import InitView, LinkAddView, TabView, TabOrderView

urlpatterns = patterns('',
    url(r'^initialize/$', InitView.as_view(), name='init'),
    url(r'^tab/', include([
        url(r'^$', TabView.as_view(), name='add'),
        url(r'^order/$', TabOrderView.as_view(), name='order'),
        url(r'^(?P<reference>\w+)/$', TabView.as_view(), name='edit'),
        url(r'^(?P<reference>\w+)/delete/$', TabView.as_view(remove=True), name='delete'),
    ],namespace='tab')),
    
    url(r'^link/', include([
        url(r'^add/', LinkAddView.as_view(), name='add'),
    ],namespace='link')),
    
    # let the front-end deal with these urls
    url(r'^tabs/(?P<tag>\w+)/$', IndexView.as_view(), name='tabs'),
    url(r'^tabs/add/$', IndexView.as_view(), name='tabs_index_add'),
    url(r'^tabs/order/$', IndexView.as_view(), name='tabs_index_order'),
    url(r'^tabs/edit/(?P<id>\w+)/$', IndexView.as_view(), name='tabs_index_edit'),
    url(r'^link/(?P<link>\w+)/$', IndexView.as_view(), name='link')
)