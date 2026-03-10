"""WSGI config for java_learning_project project."""
import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'java_learning_project.settings')
application = get_wsgi_application()
