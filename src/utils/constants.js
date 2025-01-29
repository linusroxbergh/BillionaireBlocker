const STORAGE_KEYS = {
  KEYWORDS: 'keywords'
};

const MESSAGES = {
  TOGGLE_VISIBILITY: 'TOGGLE_VISIBILITY',
  UPDATE_KEYWORDS: 'UPDATE_KEYWORDS',
  REFRESH_CONTENT: 'REFRESH_CONTENT'
};

// Attach to global "window" so other scripts can see them:
window.STORAGE_KEYS = STORAGE_KEYS;
window.MESSAGES = MESSAGES;
