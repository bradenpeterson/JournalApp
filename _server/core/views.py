from django.shortcuts import render
from django.conf  import settings
import json
import os
from datetime import timedelta
from django.contrib.auth.decorators import login_required
from django.utils import timezone
from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import JournalEntry, Tag
from .serializers import JournalEntrySerializer, TagSerializer
from django.http import JsonResponse
from django.middleware.csrf import get_token

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
        
        date_str = self.request.query_params.get('date')
        if date_str:
            try:
                qs = qs.filter(date=date_str)
            except ValueError:
                pass

        return qs
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def stats(self, request):
        """Return user's journal statistics."""
        user = request.user
        entries = JournalEntry.objects.filter(user=user).order_by('date')
        
        # Total entries
        total_entries = entries.count()
        
        # Total words
        total_words = sum(len(e.content.split()) for e in entries if e.content)
        
        # Day streak (consecutive days from today backwards)
        day_streak = self._calculate_day_streak(user)
        
        # Week streak (consecutive weeks with at least 1 entry)
        week_streak = self._calculate_week_streak(user)
        
        return Response({
            'day_streak': day_streak,
            'week_streak': week_streak,
            'total_entries': total_entries,
            'total_words': total_words,
        })
    
    def _calculate_day_streak(self, user):
        """Calculate consecutive days with entries from today backwards."""
        streak = 0
        current_date = timezone.localdate()
        
        while True:
            if JournalEntry.objects.filter(user=user, date=current_date).exists():
                streak += 1
                current_date -= timedelta(days=1)
            else:
                break
        
        return streak
    
    def _calculate_week_streak(self, user):
        """Calculate consecutive weeks (ISO weeks) with at least 1 entry."""
        entries = JournalEntry.objects.filter(user=user).order_by('-date')
        if not entries.exists():
            return 0
        
        streak = 0
        current_date = timezone.localdate()
        
        # Start from the current ISO week
        while True:
            year, week_num, _ = current_date.isocalendar()
            week_start = timezone.datetime.strptime(f'{year}-W{week_num:02d}-1', "%Y-W%W-%w").date()
            week_end = week_start + timedelta(days=6)
            
            if JournalEntry.objects.filter(user=user, date__gte=week_start, date__lte=week_end).exists():
                streak += 1
                current_date = week_start - timedelta(days=1)
            else:
                break
        
        return streak
    

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


def csrf_token(request):
    """Return a JSON response and ensure a CSRF cookie is set for the client."""
    token = get_token(request)
    return JsonResponse({'csrfToken': token})