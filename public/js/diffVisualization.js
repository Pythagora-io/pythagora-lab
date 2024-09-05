function displayFileDiff(file, diffContent) {
    const fileDiffContent = document.getElementById('fileDiffContent');
    fileDiffContent.innerHTML = `<h5>${file}</h5>`;

    const diff2htmlUi = new Diff2HtmlUI(fileDiffContent, diffContent, {
        drawFileList: false,
        matching: 'lines',
        outputFormat: 'side-by-side',
        synchronisedScroll: true,
    });

    diff2htmlUi.draw();
    diff2htmlUi.highlightCode();
}

document.addEventListener('DOMContentLoaded', function() {
    const changedFilesList = document.getElementById('changedFilesList');
    if (changedFilesList) {
        changedFilesList.addEventListener('click', function(event) {
            if (event.target.tagName === 'A') {
                event.preventDefault();
                const file = event.target.textContent;
                const projectStateId = event.target.getAttribute('data-project-state-id');
                const branchId = event.target.getAttribute('data-branch-id');

                fetch('/diff/file', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ projectStateId, branchId, file })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.diff) {
                        displayFileDiff(file, data.diff);
                    } else {
                        console.error('No diff data received');
                    }
                })
                .catch(error => {
                    console.error('Error fetching file diff:', error);
                });
            }
        });
    }
});