# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('base', '0001_initial'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='profile',
            options={'ordering': ['-display_order']},
        ),
        migrations.AddField(
            model_name='profile',
            name='display_order',
            field=models.IntegerField(default=0),
            preserve_default=True,
        ),
    ]
