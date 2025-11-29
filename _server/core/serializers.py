from rest_framework import serializers
from .models import JournalEntry, Tag

class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ['id', 'name']


class JournalEntrySerializer(serializers.ModelSerializer):
    tags = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Tag.objects.all(),
        required=False
    )

    class Meta:
        model = JournalEntry
        fields = [
            'id', 'user', 'title', 'content', 'date', 'created_at', 'updated_at',
            'is_private', 'tags', 'image', 'mood'
        ]
        read_only_fields = ['user', 'created_at', 'updated_at']

    def to_representation(self, instance):
        """Return nested tag objects for reading, but accept IDs for writing."""
        data = super().to_representation(instance)
        data['tags'] = TagSerializer(instance.tags.all(), many=True).data
        return data