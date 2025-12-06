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
from .models import JournalEntry, Tag, Mood
from .serializers import JournalEntrySerializer, TagSerializer
from .serializers import JournalEntrySerializer, TagSerializer, MoodSerializer
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
        from django.db.models import Q
        qs = JournalEntry.objects.filter(user=self.request.user)
        
        # Keyword search across title and content
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(Q(title__icontains=search) | Q(content__icontains=search))
        
        # Date range filters
        start_date = self.request.query_params.get('start_date')
        if start_date:
            try:
                qs = qs.filter(date__gte=start_date)
            except ValueError:
                pass
        
        end_date = self.request.query_params.get('end_date')
        if end_date:
            try:
                qs = qs.filter(date__lte=end_date)
            except ValueError:
                pass
        
        # Filter by tags (comma-separated IDs)
        tags = self.request.query_params.get('tags')
        if tags:
            try:
                tag_ids = [int(tid.strip()) for tid in tags.split(',') if tid.strip()]
                if tag_ids:
                    qs = qs.filter(tags__id__in=tag_ids).distinct()
            except (ValueError, AttributeError):
                pass
        
        # Filter by mood
        mood = self.request.query_params.get('mood')
        if mood:
            # Join with Mood table and filter by mood value
            qs = qs.filter(mood_entries__mood=mood).distinct()
        
        # Filter by month-day (e.g., ?month_day=11-29 for Nov 29)
        month_day = self.request.query_params.get('month_day')
        if month_day:
            try:
                month, day = map(int, month_day.split('-'))
                qs = qs.filter(date__month=month, date__day=day).order_by('-date')
            except (ValueError, AttributeError):
                pass
        
        # Filter by specific date
        date_str = self.request.query_params.get('date')
        if date_str:
            try:
                qs = qs.filter(date=date_str)
            except ValueError:
                pass

        return qs.order_by('-date')
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def stats(self, request):
        """Return user's journal statistics."""
        user = request.user
        entries = JournalEntry.objects.filter(user=user).order_by('date')

        # Total entries
        total_entries = entries.count()

        # Total words: use the denormalized `word_count` column for a fast DB aggregate
        from django.db.models import Sum
        from django.db.models.functions import Coalesce

        total_words = JournalEntry.objects.filter(user=user).aggregate(
            total_words=Coalesce(Sum('word_count'), 0)
        )['total_words']
        
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
        # Fetch all distinct dates for the user in one query to avoid N queries
        # for each day while walking back.
        dates = JournalEntry.objects.filter(user=user).values_list('date', flat=True).distinct()
        date_set = set(dates)

        streak = 0
        current_date = timezone.localdate()

        while current_date in date_set:
            streak += 1
            current_date -= timedelta(days=1)

        return streak

    def _calculate_week_streak(self, user):
        """Calculate consecutive ISO weeks with at least 1 entry, starting from this week."""
        # Fetch all distinct entry dates for user and compute ISO weeks set in memory
        dates = JournalEntry.objects.filter(user=user).values_list('date', flat=True).distinct()
        if not dates:
            return 0

        weeks_with_entries = set((d.isocalendar()[0], d.isocalendar()[1]) for d in dates)

        streak = 0
        today = timezone.localdate()
        # Start from the Monday of this ISO week
        week_start = today - timedelta(days=(today.isoweekday() - 1))

        # Loop backward week by week by subtracting 7 days
        while True:
            y, w, _ = week_start.isocalendar()
            if (y, w) in weeks_with_entries:
                streak += 1
                week_start -= timedelta(days=7)
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


class MoodViewSet(viewsets.ModelViewSet):
    serializer_class = MoodSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Mood.objects.filter(user=self.request.user)
        date_str = self.request.query_params.get('date')
        if date_str:
            try:
                qs = qs.filter(date=date_str)
            except ValueError:
                pass
        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


def csrf_token(request):
    """Return a JSON response and ensure a CSRF cookie is set for the client."""
    token = get_token(request)
    return JsonResponse({'csrfToken': token})