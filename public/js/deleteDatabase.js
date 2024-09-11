// This script is responsible for handling the deletion of database files from the server.

document.addEventListener('DOMContentLoaded', () => {
    const deleteButtons = document.querySelectorAll('.delete-database-btn');
    deleteButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
            e.preventDefault();
            const databaseName = button.dataset.databaseName;

            // Add confirmation dialog
            if (!confirm(`Are you sure you want to delete the database '${databaseName}'? This action cannot be undone.`)) {
                return;
            }

            try {
                const response = await fetch('/delete-database', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ databaseName }),
                });
                const result = await response.json();

                if (result.success) {
                    alert(result.message);
                    location.reload();
                } else {
                    alert(`Error: ${result.message}`);
                }
            } catch (error) {
                console.error('Error:', error);
                alert('An error occurred while deleting the database.');
            }
        });
    });
});