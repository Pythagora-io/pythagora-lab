function toggleVisibility(key, uniqueId) {
    const elementId = `${key}-${uniqueId}`;
    const element = document.getElementById(elementId);
    if (element) {
        // Get computed styles
        const style = window.getComputedStyle(element);
        if (style.display === "none") {
            element.style.display = "block";
            console.log(`Element with ID ${elementId} is now visible.`);
        } else {
            element.style.display = "none";
            console.log(`Element with ID ${elementId} is now hidden.`);
        }
    } else {
        console.error(`Element with ID ${elementId} not found.`);
    }
}