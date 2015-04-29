from base.forms import ModelForm
from bookmarks.models import Link, Tab

class TabForm(ModelForm):
    class Meta:
        model = Tab

class LinkForm(ModelForm):
    
    class Meta:
        model = Link
        fields = ['tab', 'url', 'name']
    
    def clean(self):
        super(LinkForm,self).clean()
        tab = self.data.get('tab',None)
        if tab:
            self.instance.tab_id = self._clean_tab(tab)    
        print self.instance.__dict__
    
    def clean_tab(self):
        data = self.cleaned_data['tab']
        print data
        return data
    
    def _clean_tab(self,tab):
        # the 'tab' data will be a reference to a tab obj, not the actual obj
        # change it in the form to the correct obj
        try:
            tab = Tab.objects.get(reference=tab).id
        except Tab.DoesNotExist:
            raise forms.ValidationError("Tab is not valid!")
            
        return tab