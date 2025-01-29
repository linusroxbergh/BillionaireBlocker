class ContentBlocker {
  constructor() {
    this.hiddenElements = new Set();
    this.isHidden = true;

    this.counterEl = null;
    this.detailsEl = null;

    // We'll store the latest keywords so we can re-scan if they change
    this.keywords = [];

    // Instead of immediate scanning for every DOM mutation, we'll periodically scan
    // the page at intervals.
    this.scanIntervalMs = 3000; // 3-second interval (adjust as needed)
    this.scanTimer = null;

    this.initializeBlocker();
    this.setupMessageListener();
  }

  async initializeBlocker() {
    const { [STORAGE_KEYS.KEYWORDS]: keywords = [] } =
      await chrome.storage.sync.get(STORAGE_KEYS.KEYWORDS);
    this.keywords = keywords;

    // Create the UI
    this.createCounterUI();

    // Run an initial scan
    this.runFullScan();

    // Set up a periodic scan to catch new or changed elements
    this.startPeriodicScan();
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === MESSAGES.REFRESH_CONTENT) {
        // Immediately refresh (and re-scan) on demand
        this.refreshContent().then(() => {
          sendResponse?.();
        });
        return true; // Indicate we'll respond asynchronously
      }
      if (message.type === MESSAGES.TOGGLE_VISIBILITY) {
        this.toggleVisibility();
        sendResponse?.({ state: this.isHidden ? 'hidden' : 'visible' });
      }
    });
  }

  startPeriodicScan() {
    // Clear any existing interval
    if (this.scanTimer) {
      clearInterval(this.scanTimer);
    }
    // Set up a new interval
    this.scanTimer = setInterval(() => {
      // We do a partial or full scan every X seconds
      this.runFullScan();
    }, this.scanIntervalMs);
  }

  async refreshContent() {
    // Force an immediate refresh: unhide everything, clear hiddenElements, re-scan
    this.unhideAll();
    this.hiddenElements.clear();

    const { [STORAGE_KEYS.KEYWORDS]: keywords = [] } =
      await chrome.storage.sync.get(STORAGE_KEYS.KEYWORDS);
    this.keywords = keywords;

    this.runFullScan();
  }

  unhideAll() {
    this.hiddenElements.forEach(el => {
      el.style.display = '';
    });
  }

  /**
   * Full scan: For demonstration, we scan all <div> and <span> elements.  
   * But you could refine or optimize which elements get scanned, or do “chunks.”
   */
  runFullScan() {
    // We only hide if isHidden is true
    // First, unhide all if we’re refreshing the entire page
    // (But you could skip this if you want to do incremental checks)
    this.unhideAll();
    this.hiddenElements.clear();

    if (!this.keywords || !this.keywords.length) {
      this.updateCounter();
      this.updateDetailsPanel();
      return;
    }

    const allDivsAndSpans = document.querySelectorAll('div, span');
    allDivsAndSpans.forEach(element => {
      // Skip our extension's own UI
      if (
        element.classList.contains('billionaire-blocker-counter') ||
        element.classList.contains('billionaire-blocker-details')
      ) {
        return;
      }

      const text = element.textContent.toLowerCase();
      // If any keyword is found in this element
      if (this.keywords.some(k => text.includes(k.toLowerCase()))) {
        this.hiddenElements.add(element);
      }
    });

    // Hide them only if we are in hidden mode
    if (this.isHidden) {
      this.hiddenElements.forEach(el => {
        el.style.display = 'none';
      });
    }

    this.updateCounter();
    this.updateDetailsPanel();
  }

  createCounterUI() {
    // Remove any existing
    const existingCounter = document.querySelector('.billionaire-blocker-counter');
    if (existingCounter) existingCounter.remove();

    const existingDetails = document.querySelector('.billionaire-blocker-details');
    if (existingDetails) existingDetails.remove();

    // The main counter
    this.counterEl = document.createElement('div');
    this.counterEl.className = 'billionaire-blocker-counter hide';
    document.body.appendChild(this.counterEl);

    // The hidden details panel
    this.detailsEl = document.createElement('div');
    this.detailsEl.className = 'billionaire-blocker-details hide';
    document.body.appendChild(this.detailsEl);

    // Clicking the counter toggles the details panel
    this.counterEl.addEventListener('click', () => {
      this.detailsEl.classList.toggle('hide');
    });

    this.updateCounter();
    this.updateDetailsPanel();
  }

  updateCounter() {
    if (!this.counterEl) return;
    const count = this.hiddenElements.size;
    if (count > 0) {
      this.counterEl.textContent = `${count} item${count > 1 ? 's' : ''} hidden`;
      this.counterEl.classList.remove('hide');
    } else {
      this.counterEl.textContent = '';
      this.counterEl.classList.add('hide');
    }
  }

  updateDetailsPanel() {
    if (!this.detailsEl) return;

    const count = this.hiddenElements.size;
    if (count === 0) {
      this.detailsEl.innerHTML = '';
      this.detailsEl.classList.add('hide');
      return;
    }

    let html = '<h4>Hidden Items</h4>';
    let i = 1;
    this.hiddenElements.forEach(el => {
      const text = el.textContent.trim().replace(/\s+/g, ' ');
      // Show only the first ~80 characters
      const snippet = text.substring(0, 80) + (text.length > 80 ? '...' : '');
      html += `<div class="hidden-item"><strong>${i}.</strong> ${snippet}</div>`;
      i++;
    });

    this.detailsEl.innerHTML = html;
  }

  toggleVisibility() {
    // Flip our boolean
    this.isHidden = !this.isHidden;

    // Now apply the style
    this.hiddenElements.forEach(el => {
      el.style.display = this.isHidden ? 'none' : '';
    });

    // If we just unhid everything, hide the details panel
    if (!this.isHidden) {
      this.detailsEl.classList.add('hide');
    }
  }
}

// Initialize
new ContentBlocker();
