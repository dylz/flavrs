from django.forms import ModelForm as MF

from base.utils import generate_reference

class ModelForm(MF):
    
    def clean_reference(self):
        data = self.cleaned_data['reference']
        
        if not data or data == '0':
            data = generate_reference()
        
        return data