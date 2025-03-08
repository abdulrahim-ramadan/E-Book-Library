from django.shortcuts import render, get_object_or_404
from django.http import FileResponse, Http404
from django.db.models import Q
from django.conf import settings
import os
from .models import Book

# Create your views here.

def home(request):
    # Get books for each section
    featured_books = Book.objects.filter(display_section='featured')
    review_books = Book.objects.filter(display_section='reviews')
    
    # Handle search
    query = request.GET.get('q')
    search_results = []
    if query:
        search_results = Book.objects.filter(
            Q(title__icontains=query) |
            Q(author__icontains=query) |
            Q(description__icontains=query)
        )
    
    context = {
        'featured_books': featured_books,
        'review_books': review_books,
        'search_results': search_results,
        'query': query
    }
    
    return render(request, 'base.html', context)

def featured(request):
    """View for featured books page"""
    books = Book.objects.filter(display_section='featured')
    return render(request, 'books/featured.html', {'featured_books': books})

def reviews(request):
    """View for book reviews page"""
    books = Book.objects.filter(display_section='reviews')
    return render(request, 'books/reviews.html', {'review_books': books})

def serve_pdf(request, book_id):
    """Serve PDF file with proper headers"""
    book = get_object_or_404(Book, id=book_id)
    try:
        # Open file in binary mode
        response = FileResponse(book.pdf_file.open('rb'), content_type='application/pdf')
        # Add necessary headers
        response['Content-Disposition'] = f'inline; filename="{book.title}.pdf"'
        response['Accept-Ranges'] = 'bytes'
        response['Cache-Control'] = 'public, max-age=3600'
        response['Access-Control-Allow-Origin'] = '*'  # Allow CORS
        response['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Range'  # Important for PDF.js
        return response
    except Exception as e:
        print(f"Error serving PDF: {str(e)}")
        raise Http404("PDF file not found")
