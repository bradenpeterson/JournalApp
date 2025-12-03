from django.conf import settings
from django.db import models
from django.utils import timezone


class Tag(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='tags')
    name = models.CharField(max_length=50)

    class Meta:
        unique_together = ('user', 'name')

    def __str__(self):
        return self.name


class JournalEntry(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='entries')
    title = models.CharField(max_length=200)
    content = models.TextField()
    # Denormalized word count to make stats fast
    word_count = models.IntegerField(default=0)
    date = models.DateField(default=timezone.localdate)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_private = models.BooleanField(default=True)
    tags = models.ManyToManyField(Tag, blank=True, related_name='entries')
    image = models.ImageField(upload_to='entry_photos/', null=True, blank=True)
    mood = models.CharField(max_length=50, blank=True)

    class Meta:
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"{self.title} ({self.date})"

    def save(self, *args, **kwargs):
        # Keep word_count in sync with content; simple split on whitespace.
        try:
            self.word_count = len(self.content.split()) if self.content else 0
        except Exception:
            self.word_count = 0
        super().save(*args, **kwargs)


class Mood(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='moods')
    date = models.DateField(default=timezone.localdate)
    mood = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'date')
        ordering = ['-date']

    def __str__(self):
        return f"Mood {self.mood} on {self.date}"