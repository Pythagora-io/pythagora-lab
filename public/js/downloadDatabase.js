document.addEventListener('DOMContentLoaded', function() {
  const downloadButtons = document.querySelectorAll('.download-database');

  downloadButtons.forEach(button => {
    button.addEventListener('click', function() {
      const databaseName = this.getAttribute('data-database-name');
      window.location.href = `/download/${encodeURIComponent(databaseName)}`;
    });
  });
});