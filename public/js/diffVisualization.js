console.log('Diff2Html availability:', typeof Diff2Html !== 'undefined');
console.log('Diff2HtmlUI availability:', typeof Diff2HtmlUI !== 'undefined');

if (typeof Diff2Html === 'undefined') {
    console.error('Diff2Html is not loaded. Please check if the library is included correctly.');
}

function displayFileDiff(file, diffContent) {
    console.log('Entering displayFileDiff function');
    console.log('File:', file);

    try {
        const fileDiffContent = document.getElementById('fileDiffContent');
        console.log('fileDiffContent element:', fileDiffContent);

        if (!fileDiffContent) {
            throw new Error('fileDiffContent element not found');
        }

        fileDiffContent.innerHTML = `<h5>${file}</h5>`;

        if (typeof Diff2Html === 'undefined') {
            throw new Error('Diff2Html is not available');
        }

        console.log('Generating diff HTML');
        let diffHtml;
        try {
            const unescapedDiffContent = diffContent.replace(/\\n/g, '\n').replace(/\\t/g, '\t');

            diffHtml = Diff2Html.html(unescapedDiffContent, {
                drawFileList: true,
                matching: 'lines',
                outputFormat: 'side-by-side',
            });
            fileDiffContent.innerHTML += `<div class="diff-container">${diffHtml}</div>`;

        } catch (diffError) {
            console.error('Error generating diff HTML:', diffError);
            console.log('Error stack:', diffError.stack);
            throw diffError;
        }

        console.log('displayFileDiff function completed successfully');
    } catch (error) {
        console.error('Error in displayFileDiff:', error);
        const fileDiffContent = document.getElementById('fileDiffContent');
        if (fileDiffContent) {
            fileDiffContent.innerHTML = `<h5>${file}</h5><p>Error displaying diff: ${error.message}</p>`;
        }
    }
}

function initializeDiffVisualization() {
    console.log('initializeDiffVisualization called');
    const changedFilesList = document.getElementById('changedFilesList');
    if (changedFilesList) {
        changedFilesList.addEventListener('click', function(event) {
            if (event.target.tagName === 'A') {
                console.log('File link clicked:', event.target.textContent);
                event.preventDefault();
                const file = event.target.textContent;
                const currentRow = this.closest('tr').previousElementSibling;
                const projectStateId = currentRow.getAttribute('data-project-state-id');
                const currentTaskValue = parseInt(currentRow.getAttribute('data-current-task'));
                const currentTotalTasks = parseInt(currentRow.getAttribute('data-total-tasks'));
                console.log({currentRow, currentTaskValue, currentTotalTasks})
                const comparisonRow = findComparisonRow(currentRow, currentTaskValue, currentTotalTasks);
                const previousProjectStateId = comparisonRow.getAttribute('data-project-state-id');


                console.log('Fetching file diff for:', { file, projectStateId, previousProjectStateId });
                fetch('/diff/file', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ projectStateId, previousProjectStateId, file })
                })
                .then(response => {
                    console.log('Received response from server');
                    return response.json();
                })
                .then(data => {
                    console.log('Received diff data:', data);
                    if (data.diff) {
                        console.log('2 Calling displayFileDiff');
                        displayFileDiff(file, data.diff);
                    } else {
                        console.error('No diff data received');
                    }
                })
                .catch(error => {
                    console.error('Error fetching file diff:', error);
                    console.log('Error fetching file diff:', error.message);
                    console.trace();
                });
            }
        });
    } else {
        console.error('changedFilesList element not found');
    }
}