from django.db import models

from base.utils import generate_reference

class FrontEndModel(models.Model):
	
	"""
	System model that contains important fields required for other front-end
	facing tables.
	"""
	
	class Meta:
		abstract = True

	reference = models.CharField(max_length=32,unique=True)#,default=lambda:generate_reference())
	display_order = models.IntegerField(default=0,blank=True)
	
	def save(self, *args, **kwargs):
		
		if not self.reference:
			self.reference = generate_reference()
		
		if self.display_order == None:
			self.display_order = self.__class__.objects.filter(user=self.user).count()
		
		super(FrontEndModel,self).save(*args,**kwargs)