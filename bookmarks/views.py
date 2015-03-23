from django.views.generic import FormView

from base.views import AjaxView

from bookmarks.forms import LinkForm, TabForm

class LinkAddView(AjaxView):
    form_class = LinkForm
    success_url = None
    
class TabAddView(AjaxView):
    form_class = TabForm
    success_url = None