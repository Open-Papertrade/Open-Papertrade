from django.db import models


class Company(models.Model):
    ticker = models.CharField(max_length=16, unique=True, db_index=True)
    cik = models.CharField(max_length=16, unique=True, db_index=True)
    name = models.CharField(max_length=256)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['ticker']
        verbose_name_plural = 'Companies'

    def __str__(self):
        return f'{self.ticker} — {self.name}'


class Filing(models.Model):
    FORM_CHOICES = [
        ('10-K', '10-K (Annual Report)'),
        ('10-Q', '10-Q (Quarterly Report)'),
        ('8-K', '8-K (Current Report)'),
    ]

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='filings')
    form_type = models.CharField(max_length=16, choices=FORM_CHOICES, db_index=True)
    accession_number = models.CharField(max_length=32, unique=True)
    filed_date = models.DateField(db_index=True)
    period_of_report = models.DateField(null=True, blank=True)
    fiscal_year = models.IntegerField(null=True, blank=True, db_index=True)
    source_url = models.URLField(max_length=512)
    ingested_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-filed_date']
        indexes = [
            models.Index(fields=['company', 'form_type', '-filed_date']),
        ]

    def __str__(self):
        return f'{self.company.ticker} {self.form_type} {self.filed_date}'


class Section(models.Model):
    filing = models.ForeignKey(Filing, on_delete=models.CASCADE, related_name='sections')
    name = models.CharField(max_length=128, db_index=True)
    order = models.IntegerField(default=0)
    text = models.TextField()

    class Meta:
        ordering = ['filing', 'order']
        indexes = [
            models.Index(fields=['filing', 'name']),
        ]

    def __str__(self):
        return f'{self.filing} · {self.name}'


class Chunk(models.Model):
    section = models.ForeignKey(Section, on_delete=models.CASCADE, related_name='chunks')
    filing = models.ForeignKey(Filing, on_delete=models.CASCADE, related_name='chunks')
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='chunks')

    text = models.TextField()
    token_count = models.IntegerField(default=0)
    char_start = models.IntegerField(default=0)
    char_end = models.IntegerField(default=0)
    order = models.IntegerField(default=0)

    embedding = models.BinaryField(null=True, blank=True)
    embedding_model = models.CharField(max_length=128, blank=True, default='')
    embedding_dim = models.IntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['filing', 'order']
        indexes = [
            models.Index(fields=['company', 'filing']),
            models.Index(fields=['section']),
        ]

    def __str__(self):
        return f'chunk#{self.pk} ({self.filing})'


class IngestJob(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('running', 'Running'),
        ('success', 'Success'),
        ('failed', 'Failed'),
    ]

    url = models.URLField(max_length=512)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default='pending', db_index=True)
    filing = models.ForeignKey(
        Filing, on_delete=models.SET_NULL, null=True, blank=True, related_name='ingest_jobs'
    )
    progress = models.CharField(max_length=128, blank=True, default='')
    error = models.TextField(blank=True, default='')
    chunk_count = models.IntegerField(default=0)
    section_count = models.IntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'IngestJob#{self.pk} {self.status} {self.url[:60]}'
