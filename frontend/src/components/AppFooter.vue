<template>
  <footer class="app-footer">
    <div class="footer-content">
      <!-- Company Info -->
      <div class="footer-section company-info">
        <h3 v-if="businessInfo?.companyName" class="company-name">
          {{ businessInfo.companyName }}
        </h3>
        <p v-if="businessInfo?.address" class="company-address">
          {{ businessInfo.address }}
        </p>
        <p v-if="businessInfo?.contactEmail" class="company-contact">
          <a :href="`mailto:${businessInfo.contactEmail}`" class="contact-link">
            {{ businessInfo.contactEmail }}
          </a>
        </p>
        <p v-if="businessInfo?.phoneNumber" class="company-phone">
          <a :href="`tel:${businessInfo.phoneNumber}`" class="contact-link">
            {{ businessInfo.phoneNumber }}
          </a>
        </p>
      </div>

      <!-- Social Media Links -->
      <div v-if="hasSocialMedia" class="footer-section social-media">
        <h4 class="section-title">Follow Us</h4>
        <div class="social-links">
          <a 
            v-if="businessInfo?.socialMedia?.facebook" 
            :href="businessInfo.socialMedia.facebook"
            target="_blank"
            rel="noopener noreferrer"
            class="social-link facebook"
            title="Follow us on Facebook"
          >
            <svg class="social-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          </a>

          <a 
            v-if="businessInfo?.socialMedia?.twitter" 
            :href="businessInfo.socialMedia.twitter"
            target="_blank"
            rel="noopener noreferrer"
            class="social-link twitter"
            title="Follow us on Twitter"
          >
            <svg class="social-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
            </svg>
          </a>

          <a 
            v-if="businessInfo?.socialMedia?.instagram" 
            :href="businessInfo.socialMedia.instagram"
            target="_blank"
            rel="noopener noreferrer"
            class="social-link instagram"
            title="Follow us on Instagram"
          >
            <svg class="social-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
          </a>

          <a 
            v-if="businessInfo?.socialMedia?.linkedin" 
            :href="businessInfo.socialMedia.linkedin"
            target="_blank"
            rel="noopener noreferrer"
            class="social-link linkedin"
            title="Connect with us on LinkedIn"
          >
            <svg class="social-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
          </a>

          <a 
            v-if="businessInfo?.socialMedia?.youtube" 
            :href="businessInfo.socialMedia.youtube"
            target="_blank"
            rel="noopener noreferrer"
            class="social-link youtube"
            title="Subscribe to our YouTube channel"
          >
            <svg class="social-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
          </a>

          <a 
            v-if="businessInfo?.website" 
            :href="businessInfo.website"
            target="_blank"
            rel="noopener noreferrer"
            class="social-link website"
            title="Visit our website"
          >
            <svg class="social-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
            </svg>
          </a>
        </div>
      </div>

      <!-- Copyright -->
      <div class="footer-section copyright">
        <p>&copy; {{ currentYear }} {{ businessInfo?.companyName || 'Lesson Booking' }}. All rights reserved.</p>
      </div>
    </div>
  </footer>
</template>

<script>
import { computed } from 'vue'
import { useBranding } from '../composables/useBranding'

export default {
  name: 'AppFooter',
  setup() {
    const { businessInfo } = useBranding()

    const currentYear = computed(() => new Date().getFullYear())

    const hasSocialMedia = computed(() => {
      const social = businessInfo.value?.socialMedia
      return (social && (social.facebook || social.twitter || social.instagram || social.linkedin || social.youtube)) || businessInfo.value?.website
    })

    return {
      businessInfo,
      currentYear,
      hasSocialMedia
    }
  }
}
</script>

<style scoped>
.app-footer {
  background: var(--background-light, #f8f9fa);
  color: var(--text-primary, #374151);
  border-top: 1px solid var(--border-color, #e5e7eb);
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--spacing-xl, 2rem) var(--spacing-lg, 1.5rem) var(--spacing-lg, 1.5rem);
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: var(--spacing-lg, 1.5rem);
  align-items: start;
}

.footer-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm, 0.75rem);
}

.company-info {
  justify-self: start;
}

.social-media {
  justify-self: center;
  text-align: center;
}

.copyright {
  justify-self: end;
  text-align: right;
  align-self: end;
}

.company-name {
  font-size: var(--font-size-lg, 1.125rem);
  font-weight: 600;
  margin: 0 0 var(--spacing-xs, 0.5rem) 0;
  color: var(--text-primary, #1f2937);
}

.company-address,
.company-contact,
.company-phone {
  margin: 0;
  font-size: var(--font-size-sm, 0.875rem);
  color: var(--text-secondary, #6b7280);
  line-height: 1.4;
}

.contact-link {
  color: var(--text-secondary, #6b7280);
  text-decoration: none;
  transition: color var(--transition-normal, 0.2s ease);
}

.contact-link:hover {
  color: var(--text-primary, #1f2937);
}

.section-title {
  font-size: var(--font-size-base, 1rem);
  font-weight: 600;
  margin: 0 0 var(--spacing-sm, 0.75rem) 0;
  color: var(--text-primary, #1f2937);
}

.social-links {
  display: flex;
  gap: var(--spacing-md, 1rem);
  justify-content: center;
}

.social-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  transition: all var(--transition-normal, 0.2s ease);
  text-decoration: none;
  background: white;
  border: 1px solid var(--border-color, #e5e7eb);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.social-icon {
  width: 20px;
  height: 20px;
}

.social-link:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.social-link.facebook {
  color: #1877f2;
}

.social-link.facebook:hover {
  background: #1877f2;
  color: white;
  border-color: #1877f2;
}

.social-link.twitter {
  color: #1da1f2;
}

.social-link.twitter:hover {
  background: #1da1f2;
  color: white;
  border-color: #1da1f2;
}

.social-link.instagram {
  color: #e4405f;
}

.social-link.instagram:hover {
  background: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%);
  color: white;
  border-color: #e4405f;
}

.social-link.linkedin {
  color: #0077b5;
}

.social-link.linkedin:hover {
  background: #0077b5;
  color: white;
  border-color: #0077b5;
}

.social-link.youtube {
  color: #ff0000;
}

.social-link.youtube:hover {
  background: #ff0000;
  color: white;
  border-color: #ff0000;
}

.social-link.website {
  color: var(--primary-color, #3b82f6);
}

.social-link.website:hover {
  background: var(--primary-color, #3b82f6);
  color: white;
  border-color: var(--primary-color, #3b82f6);
}

.copyright p {
  margin: 0;
  font-size: var(--font-size-sm, 0.875rem);
  color: var(--text-secondary, #6b7280);
}

/* Responsive Design */
@media (max-width: 768px) {
  .footer-content {
    grid-template-columns: 1fr;
    text-align: center;
    gap: var(--spacing-lg, 1.5rem);
  }

  .company-info,
  .social-media,
  .copyright {
    justify-self: center;
    text-align: center;
  }

  .copyright {
    align-self: center;
  }

  .social-links {
    gap: var(--spacing-sm, 0.75rem);
  }

  .social-link {
    width: 36px;
    height: 36px;
  }

  .social-icon {
    width: 18px;
    height: 18px;
  }
}

@media (max-width: 480px) {
  .footer-content {
    padding: var(--spacing-lg, 1.5rem) var(--spacing-md, 1rem);
  }

  .company-name {
    font-size: var(--font-size-base, 1rem);
  }

  .social-link {
    width: 32px;
    height: 32px;
  }

  .social-icon {
    width: 16px;
    height: 16px;
  }
}

/* High contrast mode */
@media (prefers-contrast: high) {
  .social-link {
    border-width: 2px;
  }

  .social-link:hover {
    border-width: 2px;
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .social-link {
    transition: none;
  }

  .social-link:hover {
    transform: none;
  }
}
</style>
