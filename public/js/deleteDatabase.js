// This script is responsible for handling the deletion of database files from the server.

document.addEventListener('DOMContentLoaded', function() {
    const deleteButtons = document.querySelectorAll('.delete-database-btn');

    deleteButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();

            const databaseName = this.getAttribute('data-database-name');
            if (!databaseName) {
                console.error('Database name is missing.');
                return;
            }

            const isConfirmed = confirm(`Are you sure you want to delete the database "${databaseName}"?`);
            if (!isConfirmed) {
                return;
            }

            fetch('/delete-database', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ databaseName }),
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to delete the database.');
                }
                return response.json();
            })
            .then(data => {
                console.log(`Database "${databaseName}" deleted successfully.`);
                // Reload the page to update the list of databases
                window.location.reload();
            })
            .catch(error => {
                console.error('Error deleting database:', error);
                alert('Error deleting database. Please try again.');
            });
        });
    });
});