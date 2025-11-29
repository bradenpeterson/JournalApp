from django.shortcuts import render
from django.conf  import settings
import json
import os
from django.contrib.auth.decorators import login_required
from rest_framework import viewsets, permissions, filters
from .models import JournalEntry, Tag
from .serializers import JournalEntrySerializer, TagSerializer

# Load manifest when server launches
MANIFEST = {}
if not settings.DEBUG:
    f = open(f"{settings.BASE_DIR}/core/static/manifest.json")
    MANIFEST = json.load(f)

# Create your views here.
@login_required
def index(req):
    context = {
        "asset_url": os.environ.get("ASSET_URL", ""),
        "debug": settings.DEBUG,
        "manifest": MANIFEST,
        "js_file": "" if settings.DEBUG else MANIFEST["src/main.ts"]["file"],
        "css_file": "" if settings.DEBUG else MANIFEST["src/main.ts"]["css"][0]
    }
    return render(req, "core/index.html", context)


class JournalEntryViewSet(viewsets.ModelViewSet):
    serializer_class = JournalEntrySerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'content', 'mood', 'tags__name']
    ordering_fields = ['date', 'created_at', 'updated_at']

    def get_queryset(self):
        qs = JournalEntry.objects.filter(user=self.request.user)
        
        # Filter by month-day (e.g., ?month_day=11-29 for Nov 29)
        month_day = self.request.query_params.get('month_day')
        if month_day:
            try:
                month, day = map(int, month_day.split('-'))
                qs = qs.filter(date__month=month, date__day=day).order_by('-date')
            except (ValueError, AttributeError):
                pass
        
        return qs
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    

class TagViewSet(viewsets.ModelViewSet):
    serializer_class = TagSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name']
    ordering_fields = ['name']

    def get_queryset(self):
        return Tag.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)