from django.contrib import admin
from django.utils.html import format_html
from .models import Book, BookCategory

@admin.register(BookCategory)
class BookCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'description', 'book_count')
    search_fields = ('name', 'description')
    
    def book_count(self, obj):
        return obj.books_category.count()
    book_count.short_description = 'Number of Books'

@admin.register(Book)
class BookAdmin(admin.ModelAdmin):
    list_display = ('title', 'author', 'category', 'display_section', 'rating_stars', 'cover_preview', 'created_at')
    list_filter = ('category', 'display_section', 'created_at', 'rating')
    search_fields = ('title', 'author', 'description')
    readonly_fields = ('cover_preview', 'pdf_preview', 'created_at', 'updated_at')
    fieldsets = (
        ('Book Information', {
            'fields': ('title', 'author', 'category', 'description')
        }),
        ('Media', {
            'fields': ('cover_image', 'cover_preview', 'pdf_file', 'pdf_preview'),
            'classes': ('collapse',)
        }),
        ('Display Options', {
            'fields': ('display_section', 'rating')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    def rating_stars(self, obj):
        stars = '★' * int(obj.rating) + '☆' * (5 - int(obj.rating))
        return format_html('<span style="color: #FFD700;">{}</span>', stars)
    rating_stars.short_description = 'Rating'
    
    def cover_preview(self, obj):
        if obj.cover_image:
            return format_html('<img src="{}" style="max-height: 100px;"/>', obj.cover_image.url)
        return "No cover available"
    cover_preview.short_description = 'Cover Preview'
    
    def pdf_preview(self, obj):
        if obj.pdf_file:
            return format_html('<a href="{}" target="_blank">View PDF</a>', obj.pdf_file.url)
        return "No PDF available"
    pdf_preview.short_description = 'PDF Preview'
    
    class Media:
        css = {
            'all': ('css/admin_custom.css',)
        }
