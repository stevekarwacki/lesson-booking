/**
 * Common utility functions for fetching data
 */

/**
 * Fetch instructors from the API and auto-select if only one exists
 * @param {string} token - Authentication token
 * @param {Object} options - Optional configuration
 * @param {Function} options.onSuccess - Callback for successful fetch
 * @param {Function} options.onError - Callback for errors
 * @param {boolean} options.autoSelectSingle - Whether to auto-select single instructor (default: true)
 * @returns {Promise<Object>} Object containing instructors array and selectedInstructor
 */
export const fetchInstructors = async (token, options = {}) => {
    const {
        onSuccess = null,
        onError = null,
        autoSelectSingle = true
    } = options

    try {
        const response = await fetch('/api/instructors', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        
        if (!response.ok) {
            throw new Error('Failed to fetch instructors')
        }
        
        const instructors = await response.json()
        
        // Auto-select if only one instructor exists
        const selectedInstructor = (autoSelectSingle && instructors.length === 1) 
            ? instructors[0] 
            : null

        const result = {
            instructors,
            selectedInstructor
        }

        if (onSuccess) {
            onSuccess(result)
        }

        return result
    } catch (err) {
        const error = 'Error fetching instructors: ' + err.message
        
        if (onError) {
            onError(error, err)
        }
        
        console.error('Error fetching instructors:', err)
        throw err
    }
}

/**
 * Fetch instructor ID for a specific user
 * @param {number} userId - User ID
 * @param {string} token - Authentication token
 * @param {Object} options - Optional configuration
 * @param {Function} options.onSuccess - Callback for successful fetch
 * @param {Function} options.onError - Callback for errors
 * @returns {Promise<string>} Instructor ID
 */
export const fetchInstructorId = async (userId, token, options = {}) => {
    const {
        onSuccess = null,
        onError = null
    } = options

    try {
        const response = await fetch(`/api/instructors/user/${userId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        
        if (!response.ok) {
            throw new Error('Failed to fetch instructor information')
        }
        
        const instructor = await response.json()
        const instructorId = instructor.id

        if (onSuccess) {
            onSuccess(instructorId)
        }

        return instructorId
    } catch (err) {
        const error = 'Error fetching instructor information: ' + err.message
        
        if (onError) {
            onError(error, err)
        }
        
        console.error('Error fetching instructor information:', err)
        throw err
    }
} 