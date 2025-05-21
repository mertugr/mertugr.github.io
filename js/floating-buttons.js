// Floating buttons HTML structure
const floatingButtonsHTML = `
    <div class="floating-buttons">
        <a href="tel:+902123215462" class="floating-button phone">
            <i class="fas fa-phone"></i>
        </a>
        <a href="https://wa.me/905322418969" class="floating-button whatsapp">
            <i class="fab fa-whatsapp"></i>
        </a>
    </div>
`;

// Add floating buttons to the page
document.addEventListener('DOMContentLoaded', function() {
    // Create a temporary container
    const temp = document.createElement('div');
    temp.innerHTML = floatingButtonsHTML;
    
    // Append the floating buttons to the body
    document.body.appendChild(temp.firstElementChild);
}); 