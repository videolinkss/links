/**
 * Video Gallery Script
 * Handles data fetching, lazy loading, infinite scroll, and navigation
 */

// Configuration
const CONFIG = {
    itemsPerLoad: 50,
    imagesPath: 'images/',
    dataPath: 'data/links.json',
    scrollThreshold: 300 // Load more when 300px from bottom
};

// Global state
let allVideos = [];
let currentIndex = 0;
let isLoading = false;
let scrollListenerAttached = false;
let currentVideoUrl = '';

// Ad popup state (single popup per click)
let adPopupStage = 0;
const MAX_AD_POPUP_STAGES = 1;
let adPopupCountdown = 0;
let adPopupIntervalId = null;

/**
 * Initialize the application
 */
function init() {
    console.log('🚀 Initializing application...');
    initVideoUrlModal();
    initAdPopup();
    loadVideoData();
}

/**
 * Setup handlers for the video URL modal
 */
function initVideoUrlModal() {
    const visitBtn = document.getElementById('video-url-visit-btn');
    const closeBtn = document.getElementById('video-url-close-btn');
    const modal = document.getElementById('video-url-modal');

    if (visitBtn) {
        visitBtn.addEventListener('click', () => {
            if (currentVideoUrl) {
                window.location.href = currentVideoUrl;
            }
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            hideVideoUrlModal();
        });
    }

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideVideoUrlModal();
            }
        });
    }
}

/**
 * Initialize ad popup (2 stages with countdown)
 */
function initAdPopup() {
    const closeBtn = document.getElementById('ad-popup-close-btn');
    const overlay = document.getElementById('ad-popup-overlay');

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            if (!closeBtn.classList.contains('visible')) {
                // Ignore clicks until countdown finished
                return;
            }
            handleAdPopupClose();
        });
    }

    if (overlay) {
        overlay.addEventListener('click', (e) => {
            // Don't allow clicking outside to close until countdown done
            if (e.target === overlay) {
                const btn = document.getElementById('ad-popup-close-btn');
                if (btn && btn.classList.contains('visible')) {
                    handleAdPopupClose();
                }
            }
        });
    }
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
 * Handle video thumbnail click - Trigger popunder ads, then show popup when user returns
 * @param {Object} video - Video object with id and url
 */
function navigateToVideo(video) {
    console.log('🎬 Video clicked:', video.id);

    // Reset any previous popups
    hideVideoUrlModal();
    resetAdPopupState();

    // Store current video URL
    currentVideoUrl = video.url;

    // Start first ad popup stage (will run twice before showing visit URL modal)
    showNextAdPopupStage();
}

/**
 * Reset ad popup state and timers
 */
function resetAdPopupState() {
    adPopupStage = 0;
    adPopupCountdown = 0;
    if (adPopupIntervalId) {
        clearInterval(adPopupIntervalId);
        adPopupIntervalId = null;
    }

    const overlay = document.getElementById('ad-popup-overlay');
    const closeBtn = document.getElementById('ad-popup-close-btn');
    if (overlay) {
        overlay.classList.add('hidden');
    }
    if (closeBtn) {
        closeBtn.classList.remove('visible');
    }
}

/**
 * Show the next ad popup stage (up to MAX_AD_POPUP_STAGES)
 */
function showNextAdPopupStage() {
    const overlay = document.getElementById('ad-popup-overlay');
    const timerSpan = document.getElementById('ad-popup-timer');
    const closeBtn = document.getElementById('ad-popup-close-btn');

    if (!overlay || !timerSpan || !closeBtn) return;

    adPopupStage += 1;

    // If we've already shown all stages, go directly to visit URL modal
    if (adPopupStage > MAX_AD_POPUP_STAGES) {
        showVideoUrlModal(currentVideoUrl);
        return;
    }

    // Load correct skyscraper ad for this stage
    loadAdForPopupStage(adPopupStage);

    // Reset countdown and UI (5 seconds)
    adPopupCountdown = 5;
    timerSpan.textContent = String(adPopupCountdown);
    closeBtn.classList.remove('visible');

    overlay.classList.remove('hidden');

    // Start countdown
    if (adPopupIntervalId) {
        clearInterval(adPopupIntervalId);
    }
    adPopupIntervalId = setInterval(() => {
        adPopupCountdown -= 1;
        if (adPopupCountdown <= 0) {
            adPopupCountdown = 0;
            timerSpan.textContent = '0';
            clearInterval(adPopupIntervalId);
            adPopupIntervalId = null;
            // Enable close button
            closeBtn.classList.add('visible');
        } else {
            timerSpan.textContent = String(adPopupCountdown);
        }
    }, 1000);
}

/**
 * Handle closing of current ad popup stage
 */
function handleAdPopupClose() {
    const overlay = document.getElementById('ad-popup-overlay');

    if (overlay) {
        overlay.classList.add('hidden');
    }

    if (adPopupIntervalId) {
        clearInterval(adPopupIntervalId);
        adPopupIntervalId = null;
    }

    // If there are more stages, show the next one; otherwise show visit URL modal
    if (adPopupStage < MAX_AD_POPUP_STAGES) {
        showNextAdPopupStage();
    } else {
        showVideoUrlModal(currentVideoUrl);
    }
}

/**
 * Inject the correct skyscraper ad into the popup for the current stage
 * Stage 1: left skyscraper key (600x160)
 * Stage 2: right/footer skyscraper key (300x160)
 */
function loadAdForPopupStage(stage) {
    const slot = document.getElementById('ad-popup-slot');
    if (!slot) return;

    // Clear previous ad content
    slot.innerHTML = '';

    let key, height, width;
    if (stage === 1) {
        key = 'c4ecf77578eb642f74a23e2a6f050b51'; // left skyscraper
        height = 600;
        width = 160;
    } else {
        key = '80452d4c78311386b34467a0adc50169'; // right/footer skyscraper
        height = 300;
        width = 160;
    }

    // Setup atOptions for this placement
    const setupScript = document.createElement('script');
    setupScript.type = 'text/javascript';
    setupScript.innerHTML = `
        atOptions = {
            key: '${key}',
            format: 'iframe',
            height: ${height},
            width: ${width},
            params: {}
        };
    `;

    // Invoke script
    const invokeScript = document.createElement('script');
    invokeScript.type = 'text/javascript';
    invokeScript.src = `https://www.highperformanceformat.com/${key}/invoke.js`;

    slot.appendChild(setupScript);
    slot.appendChild(invokeScript);
}

/**
 * Show the video URL modal
 * @param {string} url
 */
function showVideoUrlModal(url) {
    const modal = document.getElementById('video-url-modal');
    const urlText = document.getElementById('video-url-text');

    if (!modal) return;

    if (urlText) {
        urlText.textContent = url || '';
    }

    modal.classList.remove('hidden');
}

/**
 * Hide the video URL modal
 */
function hideVideoUrlModal() {
    const modal = document.getElementById('video-url-modal');
    if (!modal) return;
    modal.classList.add('hidden');
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
