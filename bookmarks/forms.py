from django.forms import ModelForm
from bookmarks.models import Link, Tab

class TabForm(ModelForm):
    class Meta:
        model = Tab
    

class LinkForm(ModelForm):
    class Meta:
        model = Link
    
    def clean_tab(self):
        # the 'tab' data will be a reference to a tab obj, not the actual obj
        # change it in the form to the correct obj
        data = self.cleaned_data['tab']
        
        try:
            obj = Tab.objects.get(reference=data)
        except Tab.DoesNotExist:
            raise forms.ValidationError("Tab is not valid!")
        else:
            data = tab
        
        return data