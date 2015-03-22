from django.db import models
from django.contrib.auth.models import User

from base.manager import BaseModel

class Reference(models.Model):
    """
    Flavrs is mostly frond-end driven, meaning that a lot of information
    is thrown around and used by other applications/modules.
    
    Instead of giving out database ids, use this 'reference' field as a unique id.
    """
    reference = models.CharField(max_length=100,unique=True)

    def __unicode__(self):
        return self.reference

class Profile(BaseModel):
    """
    Extend the default Django auth model with custom fields.
    
    Access them via 'user.profile.<x>'
    """
    user = models.OneToOneField(User)
    
    def __unicode__(self):
        return self.user.email