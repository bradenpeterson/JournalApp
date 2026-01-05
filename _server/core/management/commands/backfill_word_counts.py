from django.core.management.base import BaseCommand
from core.models import JournalEntry


class Command(BaseCommand):
    help = 'Backfill word_count for JournalEntry records in batches.'

    def handle(self, *args, **options):
        qs = JournalEntry.objects.all().order_by('id')
        count = 0
        for entry in qs.iterator():
            wc = len(entry.content.split()) if entry.content else 0
            if entry.word_count != wc:
                entry.word_count = wc
                entry.save(update_fields=['word_count'])
            count += 1
            if count % 1000 == 0:
                self.stdout.write(f'Processed {count} entries')

        self.stdout.write(f'Done. Processed {count} entries')
