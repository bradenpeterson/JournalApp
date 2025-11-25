from rest_framework import serializers
from .models import JournalEntry, Tag

class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ['id', 'name']


class JournalEntrySerializer(serializers.ModelSerializer):
    tags = TagSerializer(many=True, read_only=True)

    class Meta:
        model = JournalEntry
        fields = [
            'id', 'user', 'title', 'content', 'date', 'created_at', 'updated_at',
            'is_private', 'tags', 'image', 'mood'
        ]
        read_only_fields = ['user', 'created_at', 'updated_at']