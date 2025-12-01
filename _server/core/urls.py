from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'core'

router = DefaultRouter()
router.register(r'entries', views.JournalEntryViewSet, basename='entry')
router.register(r'tags', views.TagViewSet, basename='tag')
router.register(r'moods', views.MoodViewSet, basename='mood')

urlpatterns = [
    path('', views.index, name="index"),
    path('api/', include(router.urls)),
]