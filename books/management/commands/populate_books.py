from django.core.management.base import BaseCommand
from django.core.files import File
from books.models import Book, BookCategory
from django.conf import settings
import os

class Command(BaseCommand):
    help = 'Populate database with initial books'

    def handle(self, *args, **kwargs):
        # Create Islamic Books category
        islamic_books, created = BookCategory.objects.get_or_create(
            name="الكتب الإسلامية",
            description="مجموعة من الكتب الإسلامية القيمة"
        )

        # Books data
        books_data = [
            {
                'title': 'كيف نربي أولادنا',
                'author': 'محمد عطا رمضان',
                'image': 'img/home-book-1.png',
                'pdf': 'pdf/book1.pdf',
                'rating': 4.5,
                'display_section': 'featured'
            },
            {
                'title': 'تعدد الحليلات أم تعدد الخليلات',
                'author': 'محمد عطا رمضان',
                'image': 'img/home-book-2.png',
                'pdf': 'pdf/book2.pdf',
                'rating': 4.5,
                'display_section': 'featured'
            },
            {
                'title': 'ومضات من سيرة الشيخ عدنان بن الشيخ إبراهيم حقي',
                'author': 'محمد عطا رمضان',
                'image': 'img/home-book-4.png',
                'pdf': 'pdf/book3.pdf',
                'rating': 4.5,
                'display_section': 'featured'
            },
            {
                'title': 'مولد الرحمة المهداة',
                'author': 'محمد عطا رمضان',
                'image': 'img/discount-book-1.png',
                'pdf': 'pdf/book4.pdf',
                'rating': 4.5,
                'display_section': 'featured'
            },
            {
                'title': 'الوجيز في مناسك الحج و العمرة',
                'author': 'محمد عطا رمضان',
                'image': 'img/discount-book-2.png',
                'pdf': 'pdf/book5.pdf',
                'rating': 4.5,
                'display_section': 'featured'
            },
            {
                'title': 'خلاصة الثناء في فضيلة الحياء',
                'author': 'محمد عطا رمضان',
                'image': 'img/home-book-3.png',
                'pdf': 'pdf/book6.pdf',
                'rating': 4.5,
                'display_section': 'featured'
            },
            {
                'title': 'المفيد في علم التجويد',
                'author': 'محمد عطا رمضان',
                'image': 'img/discount-book-5.png',
                'pdf': 'pdf/book7.pdf',
                'rating': 4.5,
                'display_section': 'reviews'
            },
            {
                'title': 'اللامع في أدوات النحو اعرابها وأشهر معانيها',
                'author': 'محمد عطا رمضان',
                'image': 'img/discount-book-6.png',
                'pdf': 'pdf/book8.pdf',
                'rating': 4.5,
                'display_section': 'reviews'
            },
            {
                'title': 'الرق في التاريخ',
                'author': 'محمد عطا رمضان',
                'image': 'img/discount-book-7.png',
                'pdf': 'pdf/book9.pdf',
                'rating': 4.5,
                'display_section': 'reviews'
            },
            {
                'title': 'يفترون علينا اذيقولون',
                'author': 'محمد عطا رمضان',
                'image': 'img/discount-book-8.png',
                'pdf': 'pdf/book10.pdf',
                'rating': 4.5,
                'display_section': 'reviews'
            },
            {
                'title': 'خلاصة التحقيقات في الرد على الشبهات والتصورات',
                'author': 'محمد عطا رمضان',
                'image': 'img/discount-book-9.png',
                'pdf': 'pdf/book11.pdf',
                'rating': 4.5,
                'display_section': 'reviews'
            }
        ]

        # Create books
        for book_data in books_data:
            # Check if book already exists
            if not Book.objects.filter(title=book_data['title']).exists():
                # Create the book
                book = Book(
                    title=book_data['title'],
                    author=book_data['author'],
                    category=islamic_books,
                    rating=book_data['rating'],
                    display_section=book_data['display_section']
                )
                
                # Save to create the instance first
                book.save()

                # Get paths to static files
                static_root = settings.STATICFILES_DIRS[0] if settings.STATICFILES_DIRS else settings.STATIC_ROOT
                image_path = os.path.join(static_root, book_data['image'])
                pdf_path = os.path.join(static_root, book_data['pdf'])

                # Add image if exists
                if os.path.exists(image_path):
                    with open(image_path, 'rb') as img_file:
                        book.cover_image.save(
                            os.path.basename(image_path),
                            File(img_file),
                            save=True
                        )

                # Add PDF if exists
                if os.path.exists(pdf_path):
                    with open(pdf_path, 'rb') as pdf_file:
                        book.pdf_file.save(
                            os.path.basename(pdf_path),
                            File(pdf_file),
                            save=True
                        )

                self.stdout.write(
                    self.style.SUCCESS(f'Successfully created book "{book.title}"')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'Book "{book_data["title"]}" already exists')
                )
