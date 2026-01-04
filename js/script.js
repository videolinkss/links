/**
 * Video Gallery Script
 * Handles data fetching, lazy loading, infinite scroll, and navigation
 */

// Configuration
const CONFIG = {
    itemsPerLoad: 50,
    sliderInterval: 4000, // 4 seconds
    imagesPath: 'images/',
    dataPath: 'data/links.json',
    scrollThreshold: 300 // Load more when 300px from bottom
};

// Global state
let allVideos = [];
let currentIndex = 0;
let isLoading = false;
let scrollListenerAttached = false;

// Popup System Variables
let currentPopupStage = 0;
let currentVideoUrl = '';
let currentVideoId = '';
const POPUP_DELAY = 5000; // 5 seconds before close button appears
let popupCloseTimeout = null;
let redirectTimeout = null;

/**
 * Initialize the application
 */
function init() {
    console.log('🚀 Initializing application...');
    initPopupSystem();
    loadVideoData();
    initBannerSliders();
    initSidebarSliders();
}

/**
 * Fetch video data from JSON file
 */
async function loadVideoData() {
    try {
        console.log('📥 Fetching video data from:', CONFIG.dataPath);
        const response = await fetch(CONFIG.dataPath);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        allVideos = data.urls || [];
        
        console.log(`✅ Loaded ${allVideos.length} total videos from JSON`);
        
        if (allVideos.length === 0) {
            showError('No videos found in data file.');
            return;
        }
        
        // Initial load
        console.log(`📦 Loading initial batch of ${Math.min(CONFIG.itemsPerLoad, allVideos.length)} items...`);
        loadMoreItems();
        
        // Setup scroll listener after initial load
        setupScrollListener();
    } catch (error) {
        console.error('❌ Error loading video data:', error);
        showError('Failed to load video data. Please refresh the page.');
    }
}

/**
 * Load more items from allVideos array
 */
function loadMoreItems() {
    // Prevent multiple simultaneous loads
    if (isLoading) {
        console.log('⏸️ Already loading, skipping...');
        return;
    }
    
    // Check if all items are already loaded
    if (currentIndex >= allVideos.length) {
        console.log('✅ All items loaded. Total:', currentIndex);
        hideLoadingIndicator();
        showEndOfDataMessage();
        return;
    }
    
    isLoading = true;
    showLoadingIndicator();
    
    console.log(`📊 Loading items ${currentIndex} to ${Math.min(currentIndex + CONFIG.itemsPerLoad, allVideos.length)} of ${allVideos.length}`);
    
    // Get next batch of items
    const endIndex = Math.min(currentIndex + CONFIG.itemsPerLoad, allVideos.length);
    const batch = allVideos.slice(currentIndex, endIndex);
    
    console.log(`📦 Batch size: ${batch.length} items`);
    
    // Render items
    const galleryGrid = document.getElementById('gallery-grid');
    if (!galleryGrid) {
        console.error('❌ Gallery grid not found!');
        isLoading = false;
        return;
    }
    
    const fragment = document.createDocumentFragment();
    
    batch.forEach((video, index) => {
        const thumbnailItem = createThumbnailElement(video);
        fragment.appendChild(thumbnailItem);
    });
    
    // Append to grid (don't replace)
    galleryGrid.appendChild(fragment);
    
    // Update current index
    currentIndex = endIndex;
    
    console.log(`✅ Loaded ${currentIndex} of ${allVideos.length} items`);
    
    // Reset loading state
    isLoading = false;
    hideLoadingIndicator();
    
    // Check if all items are now loaded
    if (currentIndex >= allVideos.length) {
        console.log('🏁 All items loaded!');
        showEndOfDataMessage();
    }
}

/**
 * Setup scroll event listener for infinite scroll
 */
function setupScrollListener() {
    if (scrollListenerAttached) {
        console.log('⚠️ Scroll listener already attached');
        return;
    }
    
    console.log('👂 Setting up scroll listener...');
    
    // Throttle scroll events for performance
    let scrollTimeout;
    const handleScroll = () => {
        if (scrollTimeout) {
            clearTimeout(scrollTimeout);
        }
        
        scrollTimeout = setTimeout(() => {
            checkScrollPosition();
        }, 100);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    scrollListenerAttached = true;
    
    console.log('✅ Scroll listener attached');
}

/**
 * Check scroll position and load more if needed
 */
function checkScrollPosition() {
    const windowHeight = window.innerHeight;
    const scrollY = window.scrollY || window.pageYOffset;
    const documentHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
    
    const distanceFromBottom = documentHeight - (windowHeight + scrollY);
    
    console.log(`📏 Scroll check - Distance from bottom: ${Math.round(distanceFromBottom)}px`);
    
    // Trigger load when within threshold
    if (distanceFromBottom <= CONFIG.scrollThreshold) {
        console.log('🔥 Scroll threshold reached! Triggering load...');
        console.log(`📊 Current state - Index: ${currentIndex}, Total: ${allVideos.length}, Loading: ${isLoading}`);
        
        if (!isLoading && currentIndex < allVideos.length) {
            loadMoreItems();
        } else if (currentIndex >= allVideos.length) {
            console.log('ℹ️ All items already loaded');
        } else {
            console.log('⏸️ Already loading items...');
        }
    }
}

/**
 * Show loading indicator
 */
function showLoadingIndicator() {
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.classList.add('active');
    }
}

/**
 * Hide loading indicator
 */
function hideLoadingIndicator() {
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.classList.remove('active');
    }
}

/**
 * Show end of data message
 */
function showEndOfDataMessage() {
    const galleryGrid = document.getElementById('gallery-grid');
    if (!galleryGrid) return;
    
    // Check if end message already exists
    const existingEndMessage = galleryGrid.querySelector('.end-of-data-message');
    if (existingEndMessage) return;
    
    const endMessage = document.createElement('div');
    endMessage.className = 'end-of-data-message';
    endMessage.style.cssText = `
        grid-column: 1 / -1;
        text-align: center;
        padding: 40px 20px;
        color: var(--text-muted);
        font-size: 16px;
    `;
    endMessage.textContent = '✨ All videos loaded';
    galleryGrid.appendChild(endMessage);
}

/**
 * Create a thumbnail element for a video
 * @param {Object} video - Video object with id and url
 * @returns {HTMLElement} Thumbnail element
 */
function createThumbnailElement(video) {
    const item = document.createElement('div');
    item.className = 'thumbnail-item';
    item.setAttribute('data-id', video.id);
    item.setAttribute('role', 'button');
    item.setAttribute('tabindex', '0');
    item.setAttribute('aria-label', `Video ${video.id}`);

    // Add click handler (before appending image)
    item.addEventListener('click', () => navigateToVideo(video));
    item.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            navigateToVideo(video);
        }
    });

    // Create image element
    const img = document.createElement('img');
    const imagePath = `${CONFIG.imagesPath}${video.id}.jpg`;
    
    img.className = 'thumbnail-image';
    img.loading = 'lazy';
    img.alt = `Video thumbnail ${video.id}`;
    
    // Try to load image, show placeholder if it fails
    img.src = imagePath;
    img.onerror = function() {
        // Image doesn't exist, show placeholder
        // Remove the failed image element
        if (img.parentNode === item) {
            item.removeChild(img);
        }
        // Create and append placeholder
        const placeholder = document.createElement('div');
        placeholder.className = 'thumbnail-placeholder';
        placeholder.textContent = 'No Image';
        item.appendChild(placeholder);
    };

    // Append image to item
    item.appendChild(img);

    return item;
}

/**
 * Handle video thumbnail click - Start popup flow
 * @param {Object} video - Video object with id and url
 */
function navigateToVideo(video) {
    console.log('🎬 Video clicked:', video.id);
    
    // Store video info
    currentVideoUrl = video.url;
    currentVideoId = video.id;
    currentPopupStage = 0;
    
    // Show first popup
    showPopup(1);
}

/**
 * Initialize Popup System
 */
function initPopupSystem() {
    console.log('🎯 Initializing popup system...');
    
    const popupCloseBtn = document.getElementById('popup-close-btn');
    const redirectBtn = document.getElementById('redirect-btn');
    
    if (!popupCloseBtn || !redirectBtn) {
        console.error('❌ Popup elements not found in DOM');
        return;
    }
    
    // Close button click handler
    popupCloseBtn.addEventListener('click', () => {
        console.log('❌ Close button clicked');
        closeCurrentPopup();
    });
    
    // Redirect button click handler
    redirectBtn.addEventListener('click', () => {
        console.log('🚀 Redirect button clicked');
        redirectToVideo();
    });
    
    console.log('✅ Popup system initialized');
}

/**
 * Show Popup with Stage Number
 * @param {number} stage - Popup stage (1, 2, or 3)
 */
function showPopup(stage) {
    console.log(`📢 Showing popup stage ${stage}`);
    
    const popupOverlay = document.getElementById('popup-overlay');
    const popupCloseBtn = document.getElementById('popup-close-btn');
    const popupAdArea = document.getElementById('popup-ad-area');
    
    if (!popupOverlay || !popupCloseBtn || !popupAdArea) {
        console.error('❌ Popup elements not found');
        return;
    }
    
    // Update ad content
    popupAdArea.innerHTML = `<p class="ad-placeholder">[AD CONTENT ${stage}]</p>`;
    
    // Show overlay
    popupOverlay.classList.remove('hidden');
    
    // Hide close button initially
    popupCloseBtn.classList.add('hidden');
    
    // Clear any existing timeout
    if (popupCloseTimeout) {
        clearTimeout(popupCloseTimeout);
    }
    
    // Show close button after 5 seconds
    popupCloseTimeout = setTimeout(() => {
        console.log(`⏰ Close button now visible for popup ${stage}`);
        popupCloseBtn.classList.remove('hidden');
    }, POPUP_DELAY);
    
    currentPopupStage = stage;
}

/**
 * Close Current Popup and Move to Next Stage
 */
function closeCurrentPopup() {
    console.log(`🔒 Closing popup stage ${currentPopupStage}`);
    
    const popupOverlay = document.getElementById('popup-overlay');
    
    if (!popupOverlay) return;
    
    // Clear timeout if close button was scheduled to appear
    if (popupCloseTimeout) {
        clearTimeout(popupCloseTimeout);
        popupCloseTimeout = null;
    }
    
    // Hide current popup
    popupOverlay.classList.add('hidden');
    
    // Move to next stage
    if (currentPopupStage < 3) {
        // Show next popup after short delay
        setTimeout(() => {
            showPopup(currentPopupStage + 1);
        }, 300);
    } else {
        // All popups done, show redirect page
        console.log('✅ All popups completed, showing redirect page');
        setTimeout(() => {
            showRedirectPage();
        }, 300);
    }
}

/**
 * Show Final Redirect Page
 */
function showRedirectPage() {
    console.log('📄 Showing redirect page');
    
    const redirectOverlay = document.getElementById('redirect-overlay');
    
    if (!redirectOverlay) {
        console.error('❌ Redirect overlay not found');
        return;
    }
    
    // Show redirect overlay
    redirectOverlay.classList.remove('hidden');
    
    // Clear any existing timeout
    if (redirectTimeout) {
        clearTimeout(redirectTimeout);
    }
    
    // Auto redirect after 2 seconds
    redirectTimeout = setTimeout(() => {
        console.log('⏰ Auto-redirecting after 2 seconds');
        redirectToVideo();
    }, 2000);
}

/**
 * Redirect to Actual Video URL
 */
function redirectToVideo() {
    console.log('🌐 Redirecting to video:', currentVideoUrl);
    
    // Clear any pending timeouts
    if (redirectTimeout) {
        clearTimeout(redirectTimeout);
        redirectTimeout = null;
    }
    
    if (currentVideoUrl) {
        window.location.href = currentVideoUrl;
    } else {
        console.error('❌ No video URL to redirect to');
    }
}

/**
 * Initialize header and footer banner sliders (horizontal)
 */
function initBannerSliders() {
    // Header slider: LEFT → RIGHT
    initHorizontalSlider('.header-banner .banner-slider-horizontal', CONFIG.sliderInterval, 'left-to-right');
    
    // Footer slider: RIGHT → LEFT
    initHorizontalSlider('.footer-banner .banner-slider-horizontal', CONFIG.sliderInterval, 'right-to-left');
}

/**
 * Initialize horizontal slider (header/footer)
 * @param {string} selector - CSS selector for the slider container
 * @param {number} interval - Rotation interval in milliseconds
 * @param {string} direction - 'left-to-right' or 'right-to-left'
 */
function initHorizontalSlider(selector, interval, direction) {
    const slider = document.querySelector(selector);
    if (!slider) return;

    const slides = slider.querySelectorAll('.banner-slide');
    if (slides.length === 0) return;

    let currentSlide = 0;

    function rotateSlides() {
        // Mark current slide as previous
        slides[currentSlide].classList.remove('active');
        slides[currentSlide].classList.add('prev');
        
        // Move to next slide
        currentSlide = (currentSlide + 1) % slides.length;
        
        // Remove prev class from all slides
        slides.forEach(slide => slide.classList.remove('prev'));
        
        // Add active class to new slide
        slides[currentSlide].classList.add('active');
    }

    // Start rotation
    setInterval(rotateSlides, interval);
}

/**
 * Initialize sidebar sliders (vertical)
 */
function initSidebarSliders() {
    // Left sidebar: TOP → BOTTOM
    initVerticalSlider('.sidebar-left .sidebar-slider', CONFIG.sliderInterval, 'top-to-bottom');
    
    // Right sidebar: BOTTOM → TOP
    initVerticalSlider('.sidebar-right .sidebar-slider', CONFIG.sliderInterval, 'bottom-to-top');
}

/**
 * Initialize vertical slider (sidebars)
 * @param {string} selector - CSS selector for the slider container
 * @param {number} interval - Rotation interval in milliseconds
 * @param {string} direction - 'top-to-bottom' or 'bottom-to-top'
 */
function initVerticalSlider(selector, interval, direction) {
    const slider = document.querySelector(selector);
    if (!slider) return;

    const slides = slider.querySelectorAll('.sidebar-slide');
    if (slides.length === 0) return;

    let currentSlide = 0;

    function rotateSlides() {
        // Mark current slide as previous
        slides[currentSlide].classList.remove('active');
        slides[currentSlide].classList.add('prev');
        
        // Move to next slide
        currentSlide = (currentSlide + 1) % slides.length;
        
        // Remove prev class from all slides
        slides.forEach(slide => slide.classList.remove('prev'));
        
        // Add active class to new slide
        slides[currentSlide].classList.add('active');
    }

    // Start rotation
    setInterval(rotateSlides, interval);
}

/**
 * Show error message to user
 * @param {string} message - Error message
 */
function showError(message) {
    const galleryGrid = document.getElementById('gallery-grid');
    if (galleryGrid) {
        galleryGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #ff6b6b;">
                <p style="font-size: 18px; margin-bottom: 10px;">⚠️ Error</p>
                <p>${message}</p>
            </div>
        `;
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
