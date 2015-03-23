from django.db import models
from django.contrib.auth.models import User

from base.manager import FrontEndModel

class Tab(FrontEndModel):
    name = models.CharField(max_length=255,unique=True)
    
    @property
    def links(self):
        return Link.objects.filter(tab=self)
    
    def __unicode__(self):
        return self.tab.name

class Link(FrontEndModel):
    name = models.CharField(max_length=255)
    url = models.URLField(max_length=255)
    tab = models.ForeignKey(Tab)
    
    def __unicode__(self):
        return self.url
    

class UserToLink(models.Model):
    user = models.OneToOneField(User, related_name='bookmarks')
    tabs = models.ManyToManyField(Tab)