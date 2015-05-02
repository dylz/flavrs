from django.views.generic import FormView
from django.http import JsonResponse, HttpResponseBadRequest

from base.views import AjaxView, SystemView, OrderView

from bookmarks.forms import LinkForm, TabForm
from bookmarks.models import Tab, Link
from bookmarks.utils import get_user_tabs, create_link_dict

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
    references = ['tab']
    
    def form_valid(self, form):
        # Save the form
        form.save()
        self.form.cleaned_data = create_link_dict(form.instance)
        return super(LinkView,self).form_valid(form)
    
    def get(self, request, *args, **kwargs):
        reference =  kwargs.get('reference',None)
        
        if not reference:
            return HttpResponseBadRequest()
            
        try:
            obj = Link.objects.get(reference=reference)
        except Link.DoesNotExist:
            return HttpResponseBadRequest()
        else:
            return self.json_response(create_link_dict(obj))
    
class TabView(AjaxView):
    form_class = TabForm
    
    def form_valid(self, form):
        # Save the form
        form.save()
        return super(TabView,self).form_valid(form)
        
    def get(self, request, *args, **kwargs):
        reference =  kwargs.get('reference',None)
        
        if not reference:
            return HttpResponseBadRequest()
            
        output = []
        
        for link in Link.objects.filter(tab__reference=reference):
            output.append(create_link_dict(link))
        
        return self.json_response(output)
        
class TabOrderView(OrderView):
    model = Tab