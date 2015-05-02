import urllib2
from bs4 import BeautifulSoup

from django import forms

from base.forms import ModelForm
from bookmarks.models import Link, Tab

class TabForm(ModelForm):
    class Meta:
        model = Tab

class LinkForm(ModelForm):
    
    name = forms.CharField(required=False)
    
    class Meta:
        model = Link
        fields = ['tab', 'url', 'name']
        
    def clean_name(self):
        data = self.cleaned_data['name']
        
        # if name is empty, grab it and autofill for user
        if not data:
            soup = BeautifulSoup(urllib2.urlopen(self.cleaned_data['url']))
            data = soup.title.string
        
        return data