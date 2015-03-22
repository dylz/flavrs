from django.db import models

from base.utils import generate_reference

class BaseModel(models.Model):
	
	"""
	System model that contains important fields required for other front-end
	facing tables.
	"""
	
	class Meta:
		abstract = True

	reference = models.CharField(max_length=32,unique=True,default=lambda:generate_reference())