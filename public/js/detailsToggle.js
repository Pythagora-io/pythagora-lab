// This script is responsible for handling the unfolding of details for project states in the Pythagora Lab application and managing 'Show diff' button events.

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
                })
                .catch(error => {
                    console.error('Error fetching details:', error);
                    alert('Error fetching details. Please try again.');
                });
        });
    });

    document.querySelectorAll('.show-diff-btn').forEach(button => {
        button.addEventListener('click', function() {
            const currentRow = this.closest('tr');
            const currentTaskValue = parseInt(currentRow.getAttribute('data-current-task'));
            const currentTotalTasks = parseInt(currentRow.getAttribute('data-total-tasks'));
            const projectStateId = currentRow.getAttribute('data-project-state-id');
            const branchId = currentRow.getAttribute('data-branch-id');

            if (!projectStateId || !branchId) {
                console.error('Missing projectStateId or branchId:', { projectStateId, branchId });
                alert('Error: Missing project state ID or branch ID');
                return;
            }

            let comparisonRow = findComparisonRow(currentRow, currentTaskValue, currentTotalTasks);

            if (comparisonRow) {
                const previousProjectStateId = comparisonRow.getAttribute('data-project-state-id');
                console.log('Comparison state ID: ', previousProjectStateId)

                fetch(`/diff`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        projectStateId,
                        previousProjectStateId,
                        branchId
                    })
                })
                .then(response => response.json())
                .then(data => {
                    displayChangedFiles(data.changedFiles, this);
                })
                .catch(error => {
                    console.error('Error fetching diff:', error);
                    alert('Error fetching diff. Please try again.');
                });
            } else {
                console.log('No suitable comparison row found');
                alert('No suitable comparison state found for diff');
            }
        });
    });

    function displayChangedFiles(changedFiles, clickedButton) {
        const diffSection = document.getElementById('diffSection');
        const changedFilesList = document.getElementById('changedFilesList');
        const fileDiffContent = document.getElementById('fileDiffContent');

        if (!diffSection || !changedFilesList || !fileDiffContent) {
            console.error('One or more required elements not found in the DOM');
            return;
        }

        // Clear previous content
        [changedFilesList, fileDiffContent].forEach(element => element.innerHTML = '');

        // Display the diff section with noticeable styling
        diffSection.style.display = 'block';

        // Add changed files to the list
        changedFiles.forEach(file => {
            const listItem = document.createElement('a');
            listItem.href = '#';
            listItem.className = 'list-group-item list-group-item-action';
            listItem.textContent = file;
            listItem.setAttribute('data-project-state-id', clickedButton.getAttribute('data-project-state-id'));
            listItem.setAttribute('data-branch-id', clickedButton.getAttribute('data-branch-id'));
            changedFilesList.appendChild(listItem);
        });

        if (changedFiles.length === 0) {
            changedFilesList.innerHTML = '<p>No changes detected.</p>';
        }

        // Insert the diff section after the clicked row
        const clickedRow = clickedButton.closest('tr');
        const newRow = document.createElement('tr');
        const newCell = document.createElement('td');
        newCell.colSpan = clickedRow.cells.length;
        newCell.appendChild(diffSection);
        newRow.appendChild(newCell);
        clickedRow.parentNode.insertBefore(newRow, clickedRow.nextSibling);
    }
});