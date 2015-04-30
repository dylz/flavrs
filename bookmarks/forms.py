from base.forms import ModelForm
from bookmarks.models import Link, Tab

class TabForm(ModelForm):
    class Meta:
        model = Tab

class LinkForm(ModelForm):
    
    class Meta:
        model = Link
        fields = ['tab', 'url', 'name']