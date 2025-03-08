// PDF Viewer with Turn.js integration
class PDFViewer {
    constructor() {
        this.currentPDF = null;
        this.pageNum = 1;
        this.viewer = null;
        this.loadedPages = new Set();
        this.isLoading = false;
        this.scale = 1.0;
        this.containerWidth = 800;
        this.containerHeight = 600;
        this.pageLoadPromises = new Map(); // Track page load promises
        this.pageContents = new Map(); // Store rendered page contents
        this.pageLoadBuffer = 4; // Number of pages to preload ahead
        this.renderQueue = new Map();
        this.isAnimating = false;
    }

    async init(pdfUrl) {
        console.log('Initializing PDF viewer with URL:', pdfUrl);
        this.showLoading();
        
        try {
            // Create and append container
            const container = document.createElement('div');
            container.id = 'pdf-viewer-container';
            container.className = 'pdf-viewer-container loading';
            document.body.appendChild(container);
            
            // Create and append book div
            const book = document.createElement('div');
            book.id = 'book';
            container.appendChild(book);
            
            // Add close button with explicit event handler
            const closeBtn = document.createElement('button');
            closeBtn.innerHTML = '×';
            closeBtn.className = 'pdf-viewer-close';
            closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.close();
            });
            container.appendChild(closeBtn);

            await this.initializePDFViewer(pdfUrl);
            
            // Add controls after initialization
            this.addZoomControls(container);
            this.addNavigation(container);
            
            // Remove loading states
            container.classList.remove('loading');
            this.hideLoading();
            console.log('PDF viewer initialization complete');
            
        } catch (error) {
            console.error('Error in PDF viewer initialization:', error);
            this.hideLoading();
            alert('خطأ في تحميل الكتاب. يرجى المحاولة مرة أخرى.');
            this.close();
        }
    }

    async initializePDFViewer(pdfUrl) {
        try {
            console.log('Loading PDF document...');
            const loadingTask = pdfjsLib.getDocument({
                url: pdfUrl,
                cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/cmaps/',
                cMapPacked: true,
                enableXfa: true
            });
            this.currentPDF = await loadingTask.promise;
            console.log(`PDF loaded successfully: ${this.currentPDF.numPages} pages`);

            // Get dimensions from first page
            const page = await this.currentPDF.getPage(1);
            const dimensions = await this.calculatePageDimensions(page);
            this.scale = dimensions.scale;
            
            // Set container size
            const containerWidth = dimensions.width * 2;
            const containerHeight = dimensions.height;
            
            // Apply dimensions to book container
            const bookContainer = document.getElementById('book');
            bookContainer.style.width = `${containerWidth}px`;
            bookContainer.style.height = `${containerHeight}px`;
            
            // Center the book container
            const viewerContainer = document.querySelector('.pdf-viewer-container');
            viewerContainer.style.padding = '20px';
            viewerContainer.style.boxSizing = 'border-box';
            viewerContainer.style.display = 'flex';
            viewerContainer.style.alignItems = 'center';
            viewerContainer.style.justifyContent = 'center';
            
            // Initialize pages
            await this.loadInitialPages();
            
        } catch (error) {
            console.error('Error initializing PDF viewer:', error);
            throw error;
        }
    }

    async calculatePageDimensions(page) {
        const viewport = page.getViewport({ scale: 1.0 });
        
        // Calculate available space with fixed padding
        const padding = 40;
        const minHeight = 600; // Minimum height to ensure proper display
        
        // Calculate container dimensions
        const containerWidth = Math.min(window.innerWidth - padding * 2, 1200); // Max width of 1200px
        const containerHeight = Math.max(window.innerHeight - padding * 2, minHeight);
        
        // Calculate scale to fit width (accounting for 2 pages)
        const widthScale = (containerWidth / 2) / viewport.width;
        const heightScale = containerHeight / viewport.height;
        let scale = Math.min(widthScale, heightScale);
        
        // Ensure minimum scale
        const minScale = 0.5;
        scale = Math.max(scale, minScale);
        
        // Calculate final dimensions
        const scaledWidth = Math.floor(viewport.width * scale);
        const scaledHeight = Math.floor(viewport.height * scale);
        
        return {
            scale,
            width: scaledWidth,
            height: scaledHeight
        };
    }

    showLoading() {
        const loading = document.createElement('div');
        loading.id = 'pdf-loading';
        loading.className = 'pdf-loading';
        loading.innerHTML = '<div class="spinner"></div><p>جاري تحميل الكتاب...</p>';
        document.body.appendChild(loading);
        
        // Add loading state to container
        const container = document.querySelector('.pdf-viewer-container');
        if (container) {
            container.classList.add('loading');
        }
    }

    hideLoading() {
        const loading = document.getElementById('pdf-loading');
        if (loading) loading.remove();
        
        // Remove loading state from container
        const container = document.querySelector('.pdf-viewer-container');
        if (container) {
            container.classList.remove('loading');
        }
    }

    async preRenderAllPages() {
        console.log('Pre-rendering all pages...');
        const renderPromises = [];
        
        // Create a loading indicator
        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'pdf-loading';
        loadingIndicator.innerHTML = '<div class="spinner"></div><p>جاري تحميل الصفحات...</p>';
        document.body.appendChild(loadingIndicator);

        try {
            // Render pages in chunks to prevent memory issues
            const chunkSize = 4;
            for (let i = 1; i <= this.currentPDF.numPages; i += chunkSize) {
                const chunk = [];
                for (let j = 0; j < chunkSize && (i + j) <= this.currentPDF.numPages; j++) {
                    chunk.push(this.renderPage(i + j, true)); // Added quality parameter
                }
                await Promise.all(chunk);
            }
        } finally {
            loadingIndicator.remove();
        }
    }

    async renderPage(pageNum, highQuality = false) {
        if (this.pageContents.has(pageNum)) {
            return;
        }

        try {
            const page = await this.currentPDF.getPage(pageNum);
            const viewport = page.getViewport({ scale: this.scale });
            
            const canvas = document.createElement('canvas');
            canvas.className = 'pdf-page';
            
            // Increase pixel ratio for better quality when specified
            const pixelRatio = highQuality ? Math.min(window.devicePixelRatio || 1, 2) : 1;
            canvas.width = viewport.width * pixelRatio;
            canvas.height = viewport.height * pixelRatio;
            canvas.style.width = `${viewport.width}px`;
            canvas.style.height = `${viewport.height}px`;
            
            const context = canvas.getContext('2d', {
                alpha: false,
                willReadFrequently: false
            });
            
            context.scale(pixelRatio, pixelRatio);
            
            const renderContext = {
                canvasContext: context,
                viewport: viewport,
                enableWebGL: true,
                renderInteractiveForms: false,
                textLayer: false
            };

            await page.render(renderContext).promise;

            // Store the rendered page
            this.pageContents.set(pageNum, canvas);
            this.loadedPages.add(pageNum);

            // Preload adjacent pages
            if (pageNum > 1) this.preloadPage(pageNum - 1);
            if (pageNum < this.currentPDF.numPages) this.preloadPage(pageNum + 1);
        } catch (error) {
            console.error(`Error rendering page ${pageNum}:`, error);
        }
    }

    async preloadPage(pageNum) {
        if (!this.loadedPages.has(pageNum) && !this.renderQueue.has(pageNum)) {
            this.renderQueue.set(pageNum, this.renderPage(pageNum));
        }
    }

    async loadInitialPages() {
        console.log('Loading initial pages...');
        const book = $('#book');
        book.empty();
        
        // Create empty pages with proper structure
        for (let i = 1; i <= this.currentPDF.numPages; i++) {
            const pageDiv = $('<div/>', {
                'class': 'page-wrapper loading',
                'data-page-number': i
            });
            
            const contentDiv = $('<div/>', {
                'class': 'page-content'
            });

            // Add corner for page turning
            const cornerDiv = $('<div/>', {
                'class': 'page-corner',
                'data-corner': i % 2 === 0 ? 'left' : 'right'
            });
            
            contentDiv.append('<div class="spinner"></div>');
            contentDiv.append(cornerDiv);
            pageDiv.append(contentDiv);
            book.append(pageDiv);
        }

        // Initialize Turn.js with enhanced options
        const options = {
            width: book.width(),
            height: book.height(),
            autoCenter: true,
            gradients: true,
            acceleration: true,
            display: 'double',
            duration: 600,
            elevation: 50,
            pages: this.currentPDF.numPages,
            when: {
                start: (event, pageObject) => {
                    if (pageObject.next) {
                        this.preloadAdjacentPages(pageObject.next);
                    }
                },
                turning: async (event, page, view) => {
                    const book = $(event.target);
                    const nextView = this.getPageView(page);
                    const unloadedPages = nextView.filter(pageNum => {
                        const pageElement = book.find(`.page-wrapper[data-page-number="${pageNum}"]`);
                        return pageElement.hasClass('loading');
                    });

                    if (unloadedPages.length > 0) {
                        event.preventDefault();
                        await this.preloadAdjacentPages(page);
                        if (page === book.turn('page')) {
                            book.turn('page', page);
                        }
                    }
                },
                turned: (event, page) => {
                    this.updatePageInfo(page);
                    this.preloadAdjacentPages(page);
                }
            }
        };

        book.turn(options);

        // Initialize the corner drag interaction
        this.initCornerDrag(book);

        try {
            const initialPages = this.getPageView(1);
            await Promise.all(initialPages.map(pageNum => this.addPage(pageNum)));
            book.turn('page', 1);
        } catch (error) {
            console.error('Error loading initial pages:', error);
            this.hideLoading();
        }
    }

    initCornerDrag(book) {
        let isDragging = false;
        let startX = 0;
        let startY = 0;
        let currentPage = null;

        // Direct corner click/touch handling
        book.on('mousedown touchstart', '.page-corner', function(e) {
            e.preventDefault();
            const touch = e.type === 'touchstart' ? e.touches[0] : e;
            isDragging = true;
            startX = touch.clientX;
            startY = touch.clientY;
            currentPage = $(this).closest('.page-wrapper');
            currentPage.addClass('dragging');
        });

        // Drag handling
        $(document).on('mousemove touchmove', function(e) {
            if (!isDragging || !currentPage) return;
            e.preventDefault();

            const touch = e.type === 'touchmove' ? e.touches[0] : e;
            const deltaX = touch.clientX - startX;
            const isRightPage = currentPage.data('page-number') % 2 === 0;
            
            // Calculate drag progress (0 to 1)
            const maxDrag = 100;
            const progress = Math.min(Math.abs(deltaX) / maxDrag, 1);
            
            // Apply rotation
            const angle = isRightPage ? -progress * 180 : progress * 180;
            currentPage.css({
                transform: `rotateY(${angle}deg)`,
                transformOrigin: isRightPage ? 'right center' : 'left center',
                zIndex: 1000
            });

            // Add shadow effect
            const shadowIntensity = Math.sin(progress * Math.PI) * 0.5;
            currentPage.css({
                'box-shadow': `${isRightPage ? '' : '-'}${shadowIntensity * 20}px 0 15px rgba(0,0,0,${shadowIntensity})`
            });
        });

        // End drag handling
        $(document).on('mouseup touchend', function(e) {
            if (!isDragging || !currentPage) return;
            
            const touch = e.type === 'touchend' ? 
                (e.changedTouches ? e.changedTouches[0].clientX : startX) : e.clientX;
            
            const deltaX = touch - startX;
            const threshold = 50;
            const isRightPage = currentPage.data('page-number') % 2 === 0;

            // Complete the turn if dragged far enough
            if (Math.abs(deltaX) > threshold) {
                if ((isRightPage && deltaX < 0) || (!isRightPage && deltaX > 0)) {
                    book.turn('next');
                } else {
                    book.turn('previous');
                }
            }

            // Reset styles
            currentPage.css({
                transform: '',
                transformOrigin: '',
                boxShadow: '',
                zIndex: ''
            });

            currentPage.removeClass('dragging');
            isDragging = false;
            currentPage = null;
        });
    }

    updatePageInfo(currentPage) {
        const pageInfo = document.querySelector('.page-info');
        if (pageInfo) {
            pageInfo.textContent = `الصفحة ${currentPage} من ${this.currentPDF?.numPages || 0}`;
        }
    }

    addNavigation(container) {
        const nav = document.createElement('div');
        nav.className = 'pdf-nav';
        
        const prev = document.createElement('button');
        prev.innerHTML = '<i class="ri-arrow-left-s-line"></i>';
        prev.onclick = () => {
            const book = $('#book');
            const currentPage = book.turn('page');
            if (currentPage > 1) {
                book.turn('previous');
            }
        };
        
        const next = document.createElement('button');
        next.innerHTML = '<i class="ri-arrow-right-s-line"></i>';
        next.onclick = () => {
            const book = $('#book');
            const currentPage = book.turn('page');
            if (currentPage < this.currentPDF.numPages) {
                book.turn('next');
            }
        };
        
        const pageInfo = document.createElement('span');
        pageInfo.className = 'page-info';
        pageInfo.textContent = `الصفحة 1 من ${this.currentPDF?.numPages || 0}`;
        
        nav.appendChild(prev);
        nav.appendChild(pageInfo);
        nav.appendChild(next);
        container.appendChild(nav);
    }

    addZoomControls(container) {
        const zoomControls = document.createElement('div');
        zoomControls.className = 'pdf-zoom-controls';
        
        const zoomIn = document.createElement('button');
        zoomIn.innerHTML = '<i class="ri-zoom-in-line"></i>';
        zoomIn.onclick = () => this.zoom(1.2);
        
        const zoomOut = document.createElement('button');
        zoomOut.innerHTML = '<i class="ri-zoom-out-line"></i>';
        zoomOut.onclick = () => this.zoom(0.8);
        
        zoomControls.appendChild(zoomOut);
        zoomControls.appendChild(zoomIn);
        container.appendChild(zoomControls);
    }

    zoom(factor) {
        this.scale *= factor;
        const book = $('#book');
        const currentWidth = book.width();
        const currentHeight = book.height();
        
        book.turn('size', currentWidth * factor, currentHeight * factor);
        
        // Re-render current pages with new scale
        this.loadedPages.clear();
        this.loadInitialPages();
    }

    close() {
        try {
            const container = document.getElementById('pdf-viewer-container');
            if (container) {
                // First destroy Turn.js instance
                const book = $('#book');
                if (book.length) {
                    try {
                        book.turn('destroy').remove();
                    } catch (e) {
                        console.warn('Error destroying Turn.js instance:', e);
                    }
                }
                
                // Clear all page contents synchronously
                this.pageContents.clear();
                this.loadedPages.clear();
                this.renderQueue.clear();
                
                // Remove container immediately
                container.remove();
                
                // Clean up any remaining Turn.js elements
                $('.turn-page-wrapper').remove();
                $('.turn-page').remove();
            }

            // Remove loading indicator if present
            const loading = document.getElementById('pdf-loading');
            if (loading) {
                loading.remove();
            }
            
            // Reset all instance variables
            this.currentPDF = null;
            this.pageNum = 1;
            this.viewer = null;
            this.isLoading = false;
            this.scale = 1.0;
            this.isAnimating = false;
            
            console.log('PDF viewer closed successfully');
        } catch (error) {
            console.error('Error closing PDF viewer:', error);
            // Force remove container if there's an error
            const container = document.getElementById('pdf-viewer-container');
            if (container) container.remove();
        }
    }

    async addPage(pageNum) {
        const page = await this.currentPDF.getPage(pageNum);
        const viewport = page.getViewport({ scale: this.scale });
        
        const canvas = document.createElement('canvas');
        canvas.className = 'pdf-page';
        
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = viewport.width * pixelRatio;
        canvas.height = viewport.height * pixelRatio;
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        
        const context = canvas.getContext('2d', {
            alpha: false,
            willReadFrequently: false
        });
        
        context.scale(pixelRatio, pixelRatio);
        
        const renderContext = {
            canvasContext: context,
            viewport: viewport,
            enableWebGL: true,
            renderInteractiveForms: false,
            textLayer: false
        };

        await page.render(renderContext).promise;

        // Store the rendered page
        this.pageContents.set(pageNum, canvas);
        this.loadedPages.add(pageNum);

        // Update page element
        const pageElement = document.querySelector(`.page-wrapper[data-page-number="${pageNum}"]`);
        if (pageElement) {
            pageElement.classList.remove('loading');
            const content = pageElement.querySelector('.page-content');
            content.innerHTML = '';
            content.appendChild(canvas);
        }
    }

    async preloadAdjacentPages(pageNum) {
        const adjacentPages = this.getNextPages(pageNum, this.pageLoadBuffer);
        await this.preloadPages(adjacentPages);
    }

    async preloadPages(pages) {
        const loadPromises = pages
            .filter(pageNum => !this.loadedPages.has(pageNum))
            .map(pageNum => this.addPage(pageNum));
        
        await Promise.all(loadPromises);
    }

    getNextPages(currentPage, buffer) {
        const pages = new Set();
        for (let i = 0; i < buffer; i++) {
            const nextPage = currentPage + i;
            if (nextPage <= this.currentPDF.numPages) {
                pages.add(nextPage);
            }
            const prevPage = currentPage - i;
            if (prevPage > 0) {
                pages.add(prevPage);
            }
        }
        return Array.from(pages);
    }

    getPageView(pageNum) {
        const view = [];
        if (pageNum % 2 === 0) {
            view.push(pageNum - 1);
            view.push(pageNum);
        } else {
            view.push(pageNum);
            view.push(pageNum + 1);
        }
        return view;
    }
}

// Initialize PDF.js with worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
