/**
 * Session Evaluations Web App
 * 
 * This script fetches and displays session evaluations with classification
 * labels (pills) in a modern UI.
 */

// Mock data with pre-assigned categories
const mockFeedbackData = [
  {
    "id": 1,
    "feedback": "The presentation slides were very well designed and informative. Would be great to have them shared with all attendees afterward.",
    "date": "2025-05-14T15:30:00",
    "category": "for-organizers"
  },
  {
    "id": 2,
    "feedback": "The speaker was excellent but the Q&A session was cut short. Please allocate more time for questions in future events.",
    "date": "2025-05-14T16:45:00",
    "category": "for-organizers"
  },
  {
    "id": 3,
    "feedback": "Try to speak more slowly and enunciate more clearly. Some attendees in the back had trouble hearing you.",
    "date": "2025-05-14T14:20:00",
    "category": "for-speakers"
  },
  {
    "id": 4,
    "feedback": "The coffee during the break was amazing!",
    "date": "2025-05-14T10:15:00",
    "category": "for-organizers"
  },
  {
    "id": 5,
    "feedback": "Include more real-world examples in your next presentation to better illustrate the concepts.",
    "date": "2025-05-15T09:30:00",
    "category": "for-speakers"
  },
  {
    "id": 6,
    "feedback": "The room was too cold, please adjust the temperature for tomorrow's sessions.",
    "date": "2025-05-15T11:10:00",
    "category": "for-organizers"
  },
  {
    "id": 7,
    "feedback": "I really liked the speaker's tie.",
    "date": "2025-05-15T13:45:00",
    "category": "useless"
  },
  {
    "id": 8,
    "feedback": "Your slides had too much text. Consider using more visuals and less text for better audience engagement.",
    "date": "2025-05-15T10:20:00",
    "category": "for-speakers"
  }
];

/**
 * Format a date string into a human-readable format
 * @param {string} dateString - ISO date string
 * @return {string} Formatted date string
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric'
  }).format(date);
}

/**
 * Get the display name and CSS class for a category
 * @param {string} category - The category identifier
 * @return {Object} Object containing display name and CSS class
 */
function getCategoryInfo(category) {
  switch (category) {
    case 'for-organizers':
      return { display: 'For Organizers', cssClass: 'pill-organizer' };
    case 'for-speakers':
      return { display: 'For Speakers', cssClass: 'pill-speaker' };
    case 'useless':
      return { display: 'Useless', cssClass: 'pill-useless' };
    default:
      return { display: 'Unknown', cssClass: '' };
  }
}

/**
 * Creates HTML for an evaluation item
 * @param {Object} evaluation - The evaluation data
 * @return {string} HTML string for the evaluation
 */
function createEvaluationHTML(evaluation) {
  const categoryInfo = getCategoryInfo(evaluation.category);

  return `
    <div class="evaluation-item" data-id="${evaluation.id}">
      <p class="evaluation-content">${evaluation.feedback}</p>
      <div class="evaluation-meta">
        <span class="evaluation-pill ${categoryInfo.cssClass}">${categoryInfo.display}</span>
        <span class="evaluation-date">${formatDate(evaluation.date)}</span>
      </div>
    </div>
  `;
}

/**
 * Fetches evaluations with a simulated delay
 * @return {Promise<Array>} Promise resolving to array of evaluations
 */
async function fetchEvaluations() {
  // Simulate network delay (1-2 seconds)
  const delay = Math.floor(Math.random() * 1000) + 1000;
  
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(mockFeedbackData);
    }, delay);
  });
}

/**
 * Renders the evaluations to the DOM
 * @param {Array} evaluations - Array of evaluation objects
 */
function renderEvaluations(evaluations) {
  const container = document.getElementById('evaluations-list');

  // Sort evaluations by date (newest first)
  const sortedEvaluations = [...evaluations].sort((a, b) =>
    new Date(b.date) - new Date(a.date)
  );

  // Generate HTML for all evaluations
  const evaluationsHTML = sortedEvaluations
    .map(evaluation => createEvaluationHTML(evaluation))
    .join('');

  // Update the DOM
  container.innerHTML = evaluationsHTML;
}

/**
 * Analyzes feedback with a simulated delay
 * Shows a loading state and then reveals the pills after analysis is complete
 * @param {Array} evaluations - Array of evaluation objects
 */
async function analyzeFeedback(evaluations) {
  const button = document.getElementById('analyze-button');
  const evaluationsContainer = document.querySelector('.evaluations-container');

  // Disable button and show loading state
  button.disabled = true;
  button.innerHTML = 'Analyzing <span class="loader"></span>';

  try {
    // Simulate analysis delay (2-3 seconds)
    const delay = Math.floor(Math.random() * 1000) + 2000;
    await new Promise(resolve => setTimeout(resolve, delay));

    // Re-render evaluations with categories (already in the mock data)
    renderEvaluations(evaluations);

    // Show pills by adding a class that makes them visible
    evaluationsContainer.classList.add('pills-visible');

    // Update button state
    button.innerHTML = 'Analysis Complete';
    // Keep button disabled as analysis is done
  }
  catch (error) {
    console.error('Error analyzing feedback:', error);
    button.innerHTML = 'Analysis Failed';
    setTimeout(() => {
      button.disabled = false;
      button.innerHTML = 'Retry Analysis';
    }, 2000);
  }
}

/**
 * Initializes the application
 */
async function initApp() {
  try {
    // Show loading state
    document.getElementById('evaluations-list').innerHTML = `
      <div class="evaluation-item">
        <p>Loading evaluations...</p>
      </div>
    `;
    
    // Fetch mock data with simulated delay
    const evaluations = await fetchEvaluations();
    renderEvaluations(evaluations);

    // Add event listener to analyze button
    const analyzeButton = document.getElementById('analyze-button');
    analyzeButton.addEventListener('click', () => analyzeFeedback(evaluations));

  } catch (error) {
    console.error('Error fetching evaluations:', error);
    document.getElementById('evaluations-list').innerHTML = `
      <div class="evaluation-item error">
        <p>Failed to load evaluations. Please try again later.</p>
      </div>
    `;
  }
}

// Initialize the app when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initApp);
