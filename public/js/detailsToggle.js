// This script is responsible for handling the unfolding of details for project states in the Pythagora Lab application.

document.addEventListener('DOMContentLoaded', function() {
    // Attach click event listeners to all detail links in the project states table
    document.querySelectorAll('.detail-link').forEach(function(link) {
        link.addEventListener('click', function(event) {
            event.preventDefault(); // Prevent the default link behavior

            const detailType = this.getAttribute('data-detail-type'); // Get the type of detail (epic, task, step, iteration, etc.)
            const projectStateId = this.getAttribute('data-project-state-id'); // Get the project state ID
            const detailRowId = `details-${detailType}-${projectStateId}`;

            // Check if the details row already exists (meaning it's currently displayed)
            const existingDetailRow = document.getElementById(detailRowId);
            if (existingDetailRow) {
                // If it exists, remove it from the DOM to hide the details
                existingDetailRow.remove();
                return; // Exit the function early
            }

            // Construct the URL for the AJAX request based on the detail type and project state ID
            const requestUrl = `/details/${detailType}/${projectStateId}`;

            // Perform the AJAX request to fetch the detailed data
            fetch(requestUrl)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.text(); // Assuming the server responds with HTML content
                })
                .then(html => {
                    // Insert the detailed data below the clicked row
                    const detailRow = document.createElement('tr');
                    detailRow.setAttribute('id', detailRowId); // Set a unique ID for the detail row for easy identification
                    const detailCell = document.createElement('td');
                    detailCell.setAttribute('colspan', '10'); // Assuming there are 10 columns in the table to span full width
                    detailCell.innerHTML = html;

                    detailRow.appendChild(detailCell);
                    this.closest('tr').after(detailRow); // Insert the new row after the current row

                    console.log(`Details for ${detailType} with ID ${projectStateId} fetched successfully.`);
                })
                .catch(error => {
                    console.error('Error fetching details:', error);
                    alert('Error fetching details. Please try again.');
                });
        });
    });
});