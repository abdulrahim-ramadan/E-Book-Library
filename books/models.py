from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator

class BookCategory(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name_plural = "Book Categories"

class Book(models.Model):
    DISPLAY_CHOICES = [
        ('featured', 'كتب جديدة'),  # New Books section
        ('reviews', 'تقييمات الكتب')  # Book Reviews section
    ]

    title = models.CharField(max_length=200)
    author = models.CharField(max_length=200)
    category = models.ForeignKey(BookCategory, on_delete=models.SET_NULL, null=True, related_name='books_category')
    cover_image = models.ImageField(upload_to='covers/')
    pdf_file = models.FileField(upload_to='pdfs/')
    description = models.TextField(blank=True)
    display_section = models.CharField(max_length=10, choices=DISPLAY_CHOICES, default='featured')
    rating = models.FloatField(
        validators=[MinValueValidator(0.0), MaxValueValidator(5.0)],
        default=0.0
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

    class Meta:
        ordering = ['-created_at']
