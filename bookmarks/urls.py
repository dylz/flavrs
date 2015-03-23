from django.conf.urls import patterns, url, include

from bookmarks.views import LinkAddView, TabAddView

urlpatterns = patterns('',
    url('r^tab/', include([
        url('r^add/', TabAddView.as_view(), name='add'),
    ],namespace='tab')),
    
    url('r^link/', include([
        url('r^add/', LinkAddView.as_view(), name='add'),
    ],namespace='link'))
)