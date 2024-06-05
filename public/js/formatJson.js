// This script is designed to format and display JSON data in a human-readable format on the web page.
// It is intended to be used in conjunction with EJS templates that render JSON strings.

document.addEventListener('DOMContentLoaded', function() {
    // Find all elements that should contain formatted JSON data
    const jsonContainers = document.querySelectorAll('.json-data');

    jsonContainers.forEach(container => {
        // Parse the JSON content
        try {
            const jsonData = JSON.parse(container.innerText);
            const formattedJson = formatJsonToHtml(jsonData);
            container.innerHTML = formattedJson;

            // Add event listeners to make JSON data collapsible
            container.querySelectorAll('.collapsible-json').forEach(collapsible => {
                collapsible.addEventListener('click', function() {
                    this.classList.toggle('active');
                    const content = this.nextElementSibling;
                    if (content.style.display === 'block') {
                        content.style.display = 'none';
                    } else {
                        content.style.display = 'block';
                    }
                });
            });
        } catch (error) {
            console.error('Error parsing JSON data:', error);
            container.innerHTML = '<p>Error displaying JSON data.</p>';
        }
    });

    /**
     * Recursively formats JSON data into HTML.
     * @param {*} data - The JSON data to format.
     * @returns {string} - HTML representation of the JSON data.
     */
    function formatJsonToHtml(data) {
        let htmlContent = '';
        if (typeof data === 'object' && data !== null) {
            if (Array.isArray(data)) {
                htmlContent += '<div class="collapsible-json-content"><ol>';
                data.forEach(item => {
                    htmlContent += `<li>${formatJsonToHtml(item)}</li>`;
                });
                htmlContent += '</ol></div>';
            } else {
                htmlContent += '<div class="collapsible-json-content"><ul>';
                Object.keys(data).forEach(key => {
                    htmlContent += `<li><span class="collapsible-json">${key}:</span>${formatJsonToHtml(data[key])}</li>`;
                });
                htmlContent += '</ul></div>';
            }
        } else {
            htmlContent += ` <span class="json-value">${data}</span>`;
        }
        return htmlContent;
    }
});