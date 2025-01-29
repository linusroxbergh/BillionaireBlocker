class KeywordManager {
  constructor() {
    // DOM elements
    this.keywordsList = document.getElementById('keywords-list');
    this.keywordInput = document.getElementById('keyword-input');
    this.searchInput = document.getElementById('search-input');   // new
    this.addButton = document.getElementById('add-keyword');
    this.toggleBtn = document.getElementById('toggle-visibility');
    this.status = document.getElementById('status');

    // We'll track isHidden in the popup just for the label's sake.
    this.isHidden = true;
    this.allKeywords = [];  // store all keywords so we can filter them

    this.initializeEventListeners();
    this.loadKeywords();
  }

  initializeEventListeners() {
    this.addButton.addEventListener('click', () => this.addKeyword());
    this.keywordInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.addKeyword();
    });

    // Show/Hide toggle
    this.toggleBtn.addEventListener('click', () => this.toggleVisibility());

    // Search filter
    this.searchInput.addEventListener('input', () => this.handleSearch());
  }

  async loadKeywords() {
    const { keywords = [] } = await chrome.storage.sync.get('keywords');
    this.allKeywords = keywords;
    this.renderKeywords(); // show them
  }

  // Filter logic based on search
  handleSearch() {
    const query = this.searchInput.value.trim().toLowerCase();
    if (!query) {
      // if search box is empty, show all
      this.renderKeywords(this.allKeywords);
      return;
    }
    const filtered = this.allKeywords.filter(k => k.toLowerCase().includes(query));
    this.renderKeywords(filtered);
  }

  // Rebuild the keyword list in the DOM
  renderKeywords(list = this.allKeywords) {
    // clear existing
    this.keywordsList.innerHTML = '';
    // create elements for each keyword
    list.forEach(keyword => {
      const element = this.createKeywordElement(keyword);
      this.keywordsList.appendChild(element);
    });
  }

  async addKeyword() {
    const keyword = this.keywordInput.value.trim();
    if (!keyword) return;

    const { keywords = [] } = await chrome.storage.sync.get('keywords');
    if (!keywords.includes(keyword)) {
      keywords.push(keyword);
      await chrome.storage.sync.set({ keywords });
      this.allKeywords = keywords; // update local cache
      this.showStatus('Keyword added!');
      this.keywordInput.value = '';

      // Re-render (respecting current search filter)
      this.handleSearch();

      // Notify active tab to refresh
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) {
        chrome.tabs.sendMessage(tab.id, { type: MESSAGES.REFRESH_CONTENT });
      }
    }
  }

  createKeywordElement(keyword) {
    const element = document.createElement('div');
    element.className = 'keyword-item';

    // Show the keyword text + an edit/remove button
    element.innerHTML = `
      <span>${keyword}</span>
      <div class="keyword-actions">
        <button class="edit-btn">Edit</button>
        <button class="remove-btn">Remove</button>
      </div>
    `;

    // Attach event listeners
    const editBtn = element.querySelector('.edit-btn');
    editBtn.addEventListener('click', () => this.editKeyword(keyword));

    const removeBtn = element.querySelector('.remove-btn');
    removeBtn.addEventListener('click', () => this.removeKeyword(keyword));

    return element;
  }

  async removeKeyword(keyword) {
    const { keywords = [] } = await chrome.storage.sync.get('keywords');
    const updatedKeywords = keywords.filter(k => k !== keyword);
    await chrome.storage.sync.set({ keywords: updatedKeywords });
    this.allKeywords = updatedKeywords;
    this.showStatus('Keyword removed!');

    // Re-render (respecting current search filter)
    this.handleSearch();

    // Notify active tab to refresh
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      chrome.tabs.sendMessage(tab.id, { type: MESSAGES.REFRESH_CONTENT });
    }
  }

  // Optional: Edit (rename) an existing keyword
  async editKeyword(oldKeyword) {
    const newKeyword = prompt('Enter new keyword:', oldKeyword);
    if (!newKeyword || !newKeyword.trim()) return;
    const { keywords = [] } = await chrome.storage.sync.get('keywords');

    const index = keywords.indexOf(oldKeyword);
    if (index !== -1) {
      keywords[index] = newKeyword.trim();
      await chrome.storage.sync.set({ keywords });
      this.allKeywords = keywords;
      this.showStatus('Keyword updated!');

      // Re-render (respecting current search filter)
      this.handleSearch();

      // Notify active tab to refresh
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) {
        chrome.tabs.sendMessage(tab.id, { type: MESSAGES.REFRESH_CONTENT });
      }
    }
  }

  // The user toggles the hidden content
  async toggleVisibility() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      chrome.tabs.sendMessage(tab.id, { type: MESSAGES.TOGGLE_VISIBILITY }, (response) => {
        if (response?.state === 'visible') {
          this.isHidden = false;
          this.toggleBtn.textContent = 'Hide';
        } else {
          this.isHidden = true;
          this.toggleBtn.textContent = 'Show';
        }
      });
    }
  }

  showStatus(message) {
    this.status.textContent = message;
    setTimeout(() => {
      this.status.textContent = '';
    }, 2000);
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new KeywordManager();
});
