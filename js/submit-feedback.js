/**
 * Session Feedback Submission
 * 
 * This script handles submission of session feedback without authentication.
 */

/**
 * Submits feedback to the API
 * @param {string} feedbackText - The feedback text to submit
 * @return {Promise<Object>} Promise resolving to API response
 */
async function submitFeedback(feedbackText) {
  // Generate random ID greater than 8
  const id = Math.floor(Math.random() * 992) + 9; // Random number between 9 and 1000
  
  // Get current date in required format
  const now = new Date();
  const date = now.toISOString().slice(0, 19).replace('T', 'T');
  
  // Create feedback object
  const feedbackData = {
    id: id,
    feedback: feedbackText,
    date: date
  };
  
  // Submit feedback to API
  const response = await fetch('https://w5sz2v6h-8000.euw.devtunnels.ms/feedback', {
    method: 'POST',
    headers: {
      // Must include charset=utf-8 to properly handle emojis and special characters
      'Content-Type': 'application/json; charset=utf-8'
    },
    body: JSON.stringify(feedbackData)
  });
  
  if (!response.ok) {
    throw new Error(`Failed to submit feedback: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Shows thank you message and hide the form
 */
function showThankYouMessage() {
  document.getElementById('feedback-form-container').style.display = 'none';
  document.getElementById('thank-you-container').style.display = 'block';
}

/**
 * Initializes the application
 */
function initApp() {
  try {
    // Set up submit button event listener
    const submitButton = document.getElementById('submit-button');
    submitButton.addEventListener('click', async () => {
      const feedbackText = document.getElementById('feedback-text').value.trim();
      
      if (!feedbackText) {
        alert('Please enter your feedback before submitting.');
        return;
      }
      
      // Disable button and show loading state
      submitButton.disabled = true;
      submitButton.innerHTML = 'Submitting <span class="loader"></span>';
      
      try {
        // Submit feedback
        await submitFeedback(feedbackText);
        
        // Show thank you message
        showThankYouMessage();
      } catch (error) {
        console.error('Error submitting feedback:', error);
        alert('Failed to submit feedback. Please try again.');
        
        // Reset button
        submitButton.disabled = false;
        submitButton.textContent = 'Submit Feedback';
      }
    });
  } catch (error) {
    console.error('Error initializing app:', error);
  }
}

// Initialize the app when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('Feedback page loaded, initializing app');
  initApp();
});
