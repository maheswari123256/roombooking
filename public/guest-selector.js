document.addEventListener('DOMContentLoaded', () => {
  // Declare variables
  let adults = 0;
  let children = 0;
  let infants = 0;
  let pets = 0;
  const maxGuestsAllowed = 30;

  // Define updateGuest inside this scope
  window.updateGuest = function(type, change) {
    if (type === 'adults') adults += change;
    if (type === 'children') children += change;
    if (type === 'infants') infants += change;
    if (type === 'pets') pets += change;

    adults = Math.max(0, adults);
    children = Math.max(0, children);
    infants = Math.max(0, infants);
    pets = Math.max(0, pets);

    const totalGuests = adults + children + infants + pets;

    if (totalGuests > maxGuestsAllowed) {
      alert(`❌ Maximum ${maxGuestsAllowed} guests only allowed by host!`);
      if (type === 'adults') adults -= change;
      if (type === 'children') children -= change;
      if (type === 'infants') infants -= change;
      if (type === 'pets') pets -= change;
      return;
    }

    // Update visible counts
    document.getElementById('adults').textContent = adults;
    document.getElementById('children').textContent = children;
    document.getElementById('infants').textContent = infants;
    document.getElementById('pets').textContent = pets;

    // Update hidden inputs values
    document.getElementById('guestAdults').value = adults;
    document.getElementById('guestChildren').value = children;
    document.getElementById('guestInfants').value = infants;
    document.getElementById('guestPets').value = pets;

    updateButtonStates();
  };

  // Initialize counts on page load to show values correctly
  updateGuest(null, 0);
});
