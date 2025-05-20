/**
 * Session Evaluations Web App
 * 
 * This script fetches and displays session evaluations with classification
 * labels (pills) in a modern UI.
 */

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
 * Fetches evaluations from the API with retry logic
 * @param {number} maxRetries - Maximum number of retry attempts
 * @param {number} attempt - Current attempt number
 * @return {Promise<Array>} Promise resolving to array of evaluations
 */
async function fetchEvaluations(maxRetries = 3, attempt = 1) {
  try {
    const response = await fetch('http://api.ecs.eu/feedback');
    
    if (!response.ok) {
      // Handle 429 Too Many Requests with Retry-After header
      if (response.status === 429 && attempt <= maxRetries) {
        const retryAfter = response.headers.get('Retry-After');
        const delaySeconds = retryAfter ? parseInt(retryAfter, 10) : 5;
        console.log(`Rate limited. Retrying after ${delaySeconds} seconds...`);
        
        await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
        return fetchEvaluations(maxRetries, attempt + 1);
      }
      
      throw new Error(`API responded with status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    if (attempt < maxRetries) {
      // Exponential backoff for other errors
      const backoffTime = Math.min(Math.pow(2, attempt) * 500, 5000);
      console.log(`Attempt ${attempt} failed. Retrying after ${backoffTime}ms...`);
      
      await new Promise(resolve => setTimeout(resolve, backoffTime));
      return fetchEvaluations(maxRetries, attempt + 1);
    }
    
    throw new Error(`Failed to fetch evaluations after ${maxRetries} attempts: ${error.message}`);
  }
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
