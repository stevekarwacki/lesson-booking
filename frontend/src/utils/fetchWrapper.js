const handleError = (error) => {
    console.error('API Error:', error);
    return 'Unable to complete request. Please try again later.';
};

export const fetchWrapper = async (url, options = {}) => {
    try {
        // Ensure headers exist
        options.headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        const response = await fetch(url, options);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        if (!data) throw new Error('No data received');
        
        return { data, error: null };
    } catch (err) {
        return { 
            data: null, 
            error: handleError(err)
        };
    }
};

// Helper methods for common HTTP methods
export const api = {
    get: async (url, headers = {}) => {
        return fetchWrapper(url, { 
            method: 'GET',
            headers 
        });
    },

    post: async (url, body, headers = {}) => {
        return fetchWrapper(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
        });
    },

    patch: async (url, body, headers = {}) => {
        return fetchWrapper(url, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(body)
        });
    },

    delete: async (url, headers = {}) => {
        return fetchWrapper(url, {
            method: 'DELETE',
            headers
        });
    }
}; 