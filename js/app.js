/**
 * Session Evaluations Web App
 * 
 * This script fetches and displays session evaluations with classification
 * labels (pills) in a modern UI.
 */

// MSAL configuration
const msalConfig = {
  auth: {
    clientId: 'e3afa8d1-edb1-4587-92a0-8310c5ecaa3c',
    authority: 'https://login.microsoftonline.com/ef8c0e1b-4ee8-4e9e-a24b-64fe0def8a75',
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
};

// Request scopes for the API
const loginRequest = {
  scopes: ['api://api.ecs.eu/Feedback.Read']
};

// Initialize MSAL instance
const msalInstance = new msal.PublicClientApplication(msalConfig);

const llmUrl = 'https://ecs.openai.azure.com/openai/deployments/o4-mini/chat/completions?api-version=2025-01-01-preview';
const model = 'o4-mini';

// Import OpenAI from CDN
import OpenAI from 'https://cdn.jsdelivr.net/npm/openai@4.98.0/+esm';

const openai = new OpenAI({
  baseURL: llmUrl,
  apiKey: 'steve',
  dangerouslyAllowBrowser: true
});

/**
 * Gets an access token using MSAL
 * @returns {Promise<string|null>} Access token or null if not available
 */
async function getAccessToken() {
  try {
    // Look for accounts that MSAL already knows about
    const currentAccounts = msalInstance.getAllAccounts();
    
    // If no accounts found, user needs to log in first
    if (currentAccounts.length === 0) {
      return null;
    }
    
    // Use the first account if multiple exist
    const account = currentAccounts[0];
    
    // Get token silently if possible
    const tokenResponse = await msalInstance.acquireTokenSilent({
      scopes: loginRequest.scopes,
      account: account
    });
    
    return tokenResponse.accessToken;
  } catch (error) {
    console.error('Error acquiring token silently:', error);
    
    // If silent token acquisition fails, user needs to log in again
    return null;
  }
}

/**
 * Initiates login with redirect
 * @returns {void} Redirects to Microsoft login page
 */
function login() {
  // Redirect to Microsoft login page
  msalInstance.loginRedirect(loginRequest)
    .catch(error => {
      console.error('Error during login redirect:', error);
    });
}

/**
 * Logs out the current user
 */
function logout() {
  const logoutRequest = {
    account: msalInstance.getAccountByHomeId(msalInstance.getAllAccounts()[0].homeAccountId),
    postLogoutRedirectUri: window.location.origin,
  };
  
  // Redirect to Microsoft logout page
  msalInstance.logoutRedirect(logoutRequest)
    .catch(error => {
      console.error('Error during logout redirect:', error);
    });
}

/**
 * Checks if a user is currently logged in
 * @returns {Promise<boolean>} True if user is logged in
 */
async function isLoggedIn() {
  const currentAccounts = msalInstance.getAllAccounts();
  return currentAccounts.length > 0;
}

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
 * Fetches evaluations from the API
 * @return {Promise<Array>} Promise resolving to array of evaluations
 */
async function fetchEvaluations() {
  // Get access token
  const accessToken = await getAccessToken();
  
  if (!accessToken) {
    throw new Error('No access token available');
  }
  
  // Call the API with the access token
  const response = await fetch('https://w5sz2v6h-8000.euw.devtunnels.ms/feedback', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch evaluations: ${response.statusText}`);
  }

  return await response.json();
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
 * Retrieves the category of feedback using AI
 * @param {string} feedbackText - The feedback text to categorize
 * @return {Promise<string>} Promise resolving to the category
 */
async function getEvaluationCategory(feedbackText) {
  const validCategories = ['for-organizers', 'for-speakers', 'useless'];
  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Call OpenAI with model
      const response = await openai.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: `Classify the following piece of feedback into one of the following categories: ${validCategories.join(', ')}. Respond with the category name only. The feedback is:`
          },
          {
            role: 'user',
            content: feedbackText
          }
        ]
      });

      // Extract the category from the response
      const category = response.choices[0].message.content.trim().toLowerCase();

      // Check if it's a valid category
      if (validCategories.includes(category)) {
        return category;
      }

      console.log(`Attempt ${attempt}: Invalid category response "${category}". Retrying...`);
    }
    catch (error) {
      // If we're on the last attempt, rethrow the error
      if (attempt === maxRetries) {
        throw error;
      }
      console.log(`Attempt ${attempt} failed with error: ${error.message}. Retrying...`);
    }
  }

  // If we've exhausted all retries, return a default category
  console.warn('Failed to get a valid category after maximum retries');
  return 'useless'; // Default fallback category after all retries fail
}

/**
 * Analyzes feedback content using AI to categorize it
 * Shows a loading state and then reveals the pills after analysis is complete
 * @param {Array} evaluations - Array of evaluation objects
 */
async function analyzeFeedback(evaluations) {
  const button = document.getElementById('analyze-button');
  const evaluationsContainer = document.querySelector('.evaluations-container');

  // Disable button and show loading state
  button.disabled = true;
  button.innerHTML = 'Analyzing <span class="loader"></span>';

  // Show pills container immediately
  evaluationsContainer.classList.add('pills-visible');

  // Create a copy of evaluations to work with
  const evaluationsCopy = [...evaluations];
  
  // Counter to track progress
  let processedCount = 0;
  const totalCount = evaluations.length;

  try {
    // Process each evaluation with OpenAI API
    const processingPromises = evaluations.map(async (evaluation, index) => {
      try {
        // Get category for this evaluation
        evaluation.category = await getEvaluationCategory(evaluation.feedback);
        
        // Update the counter
        processedCount++;
        
        // Update the button text to show progress
        button.innerHTML = `Analyzing ${processedCount}/${totalCount} <span class="loader"></span>`;
        
        // Re-render all evaluations with currently available categories
        renderEvaluations(evaluationsCopy);
        
        return evaluation;
      } catch (error) {
        console.error(`Error processing evaluation #${index}:`, error);
        // Set default category for failed analyses
        evaluation.category = 'useless';
        return evaluation;
      }
    });

    // Wait for all processing to complete
    await Promise.all(processingPromises);

    // Final render (should be the same as the last incremental render)
    renderEvaluations(evaluationsCopy);

    // Log the analyzed evaluations for reference
    console.log('Analyzed evaluations:', evaluationsCopy);

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
 * Creates the login interface
 */
function createLoginInterface() {
  const container = document.getElementById('evaluations-list');
  container.innerHTML = `
    <div class="login-container">
      <p>Please sign in with your work or school account to view session evaluations.</p>
      <button id="login-button" class="login-button">
        <img src="images/ms-signin-light.svg" alt="Sign in with Microsoft" class="ms-signin-light" />
        <img src="images/ms-signin-dark.svg" alt="Sign in with Microsoft" class="ms-signin-dark" />
      </button>
    </div>
  `;
  
  // Add event listener to login button
  document.getElementById('login-button').addEventListener('click', () => {
    // With redirect, there's no need to wait or reinitialize the app here
    // The app will be reloaded after redirect
    login();
  });
}

/**
 * Initializes the application
 */
async function initApp() {
  try {
    // Hide the analyze button initially, will show it after successful login
    const analyzeButton = document.getElementById('analyze-button');
    const analyzeContainer = document.querySelector('.analysis-container');
    if (analyzeContainer) {
      analyzeContainer.style.display = 'none';
    }
    
    // Handle the redirect promise if this page was loaded after a redirect from Microsoft Entra
    await msalInstance.handleRedirectPromise();
    
    // Check if the user is logged in
    const userLoggedIn = await isLoggedIn();
    
    if (!userLoggedIn) {
      // User is not logged in, show login interface
      createLoginInterface();
      return;
    }
    
    // User is logged in
    // Show the analyze button now that the user is logged in
    if (analyzeContainer) {
      analyzeContainer.style.display = 'flex';
    }
    
    // Show loading state
    document.getElementById('evaluations-list').innerHTML = `
      <div class="loading-container">
        <p>Loading evaluations...</p>
        <span class="loader"></span>
      </div>
    `;
    
    // Add a logout button to the header
    const header = document.querySelector('header');
    if (!document.getElementById('logout-button')) {
      const logoutBtn = document.createElement('button');
      logoutBtn.id = 'logout-button';
      logoutBtn.className = 'logout-button';
      logoutBtn.textContent = 'Sign Out';
      logoutBtn.addEventListener('click', () => {
        // With redirect, page will automatically reload after logout
        logout();
      });
      header.appendChild(logoutBtn);
    }
    
    // Fetch and display evaluations
    const evaluations = await fetchEvaluations();
    renderEvaluations(evaluations);

    // Add event listener to analyze button
    analyzeButton.addEventListener('click', () => analyzeFeedback(evaluations));
    
  } catch (error) {
    console.error('Error initializing app:', error);
    document.getElementById('evaluations-list').innerHTML = `
      <div class="evaluation-item error">
        <p>Failed to load evaluations: ${error.message}</p>
        <button id="retry-button" class="retry-button">Retry</button>
      </div>
    `;
    
    // Add event listener to retry button
    document.getElementById('retry-button')?.addEventListener('click', initApp);
  }
}

// Register event callbacks for MSAL
msalInstance.addEventCallback((event) => {
  // With redirect flow, most events will happen during page load after redirects
  // These logs help with debugging
  if (event.eventType === msal.EventType.LOGIN_SUCCESS) {
    console.log('Login successful');
  } else if (event.eventType === msal.EventType.LOGIN_FAILURE) {
    console.error('Login failed:', event.error);
  } else if (event.eventType === msal.EventType.LOGOUT_SUCCESS) {
    console.log('Logout successful');
  } else if (event.eventType === msal.EventType.HANDLE_REDIRECT_START) {
    console.log('Starting to handle redirect response');
  } else if (event.eventType === msal.EventType.HANDLE_REDIRECT_END) {
    console.log('Finished handling redirect response');
  }
});

// Initialize the app when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initApp);
