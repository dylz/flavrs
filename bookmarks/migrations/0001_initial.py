# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Link',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('reference', models.CharField(unique=True, max_length=32)),
                ('name', models.CharField(max_length=255)),
                ('url', models.URLField(max_length=255)),
            ],
            options={
                'abstract': False,
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='Tab',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('reference', models.CharField(unique=True, max_length=32)),
                ('name', models.CharField(unique=True, max_length=255)),
                ('user', models.ForeignKey(related_name='user_to_bookmarks_tabs', to=settings.AUTH_USER_MODEL)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.AlterUniqueTogether(
            name='tab',
            unique_together=set([('name', 'user')]),
        ),
        migrations.AddField(
            model_name='link',
            name='tab',
            field=models.ForeignKey(to='bookmarks.Tab'),
            preserve_default=True,
        ),
    ]
