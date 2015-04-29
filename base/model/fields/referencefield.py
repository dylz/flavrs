from django.db.models import ForeignKeyField

from base.utils import generate_reference

class ReferenceField(ForeignKeyField):
    
    def __init__(self,*args,**kwargs):
        kwargs.setdefault('default', generate_reference())
        
        super(Reference,self).__init__(*args,**kwargs)
        
    def get_internal_type(self):
        return "ReferenceField"
        
    def validate(self, value):
        super(ReferenceField,self).validate(value)
    
    def prepare_value(self, value):
        return super(ReferenceField,self).prepare_value(value)