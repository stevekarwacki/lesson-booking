// Convert HH:MM to slot number (15-minute increments)
export const timeToSlot = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return (hours * 4) + Math.floor(minutes / 15);
};

// Convert slot number to HH:MM
export const slotToTime = (slot) => {
    const hours = Math.floor(slot / 4);
    const minutes = (slot % 4) * 15;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

// Calculate duration in slots
export const calculateDuration = (startSlot, endSlot) => {
    return endSlot - startSlot;
}; 