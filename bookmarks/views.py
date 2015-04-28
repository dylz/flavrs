from django.views.generic import FormView

from base.views import AjaxView, SystemView, OrderView

from bookmarks.forms import LinkForm, TabForm
from bookmarks.models import Tab
from bookmarks.utils import get_user_tabs

class InitView(SystemView):
    """
    Get required, non-static, data.
    
    This includes tabs.
    """
    
    def get_json_data(self):
        tabs = get_user_tabs(self.request.user)
        
        return {
            'sidenav': tabs
        }

class LinkView(AjaxView):
    form_class = LinkForm
    success_url = ''
    
class TabView(AjaxView):
    form_class = TabForm
    
    def form_valid(self, form):
        # Save the form
        form.save()
        return super(TabView,self).form_valid(form)
        
class TabOrderView(OrderView):
    model = Tab