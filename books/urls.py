from django.urls import path
from . import views

app_name = 'books'

urlpatterns = [
    path('', views.home, name='home'),
    path('featured/', views.featured, name='featured'),
    path('reviews/', views.reviews, name='reviews'),
    path('pdf/<int:book_id>/', views.serve_pdf, name='serve_pdf'),
]
