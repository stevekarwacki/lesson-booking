'use strict';

const fs = require('fs').promises;
const path = require('path');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Template definitions with metadata and available variables
    const templateDefinitions = [
      {
        template_key: 'booking-confirmation',
        category: 'booking',
        name: 'Booking Confirmation',
        description: 'Sent when a student successfully books a lesson with an instructor',
        default_subject: 'Lesson Booking Confirmed',
        available_variables: {
          user: {
            studentName: { type: 'string', description: 'Student\'s full name', example: 'John Smith' },
            studentEmail: { type: 'string', description: 'Student\'s email address', example: 'john@example.com' }
          },
          lesson: {
            lessonDate: { type: 'date', description: 'Formatted lesson date', example: 'Monday, January 15, 2024' },
            startTime: { type: 'time', description: 'Lesson start time', example: '2:00 PM' },
            endTime: { type: 'time', description: 'Lesson end time', example: '3:00 PM' },
            instructorName: { type: 'string', description: 'Instructor\'s name', example: 'Sarah Johnson' },
            duration: { type: 'number', description: 'Lesson duration in minutes', example: '60' }
          },
          booking: {
            bookingId: { type: 'string', description: 'Unique booking identifier', example: '12345' },
            paymentDisplay: { type: 'string', description: 'Payment method used', example: 'Lesson Credits' }
          }
        }
      },
      {
        template_key: 'purchase-confirmation',
        category: 'payment',
        name: 'Purchase Confirmation',
        description: 'Sent when a student purchases lesson credits or packages',
        default_subject: 'Purchase Confirmation - Lesson Credits',
        available_variables: {
          user: {
            userName: { type: 'string', description: 'Student\'s full name', example: 'Jane Doe' },
            userEmail: { type: 'string', description: 'Student\'s email address', example: 'jane@example.com' }
          },
          purchase: {
            planName: { type: 'string', description: 'Name of purchased plan', example: '10-Lesson Package' },
            planCredits: { type: 'number', description: 'Number of credits purchased', example: '10' },
            transactionAmount: { type: 'string', description: 'Formatted transaction amount', example: '$150.00' },
            paymentMethod: { type: 'string', description: 'Payment method used', example: 'Credit Card' },
            transactionDate: { type: 'date', description: 'Purchase date', example: 'January 15, 2024' },
            transactionId: { type: 'string', description: 'Transaction identifier', example: 'pi_123456789' }
          }
        }
      },
      {
        template_key: 'low-balance-warning',
        category: 'credit',
        name: 'Low Balance Warning',
        description: 'Sent when a student\'s lesson credits are running low',
        default_subject: 'Lesson Credits Running Low',
        available_variables: {
          user: {
            userName: { type: 'string', description: 'Student\'s full name', example: 'John Smith' },
            userEmail: { type: 'string', description: 'Student\'s email address', example: 'john@example.com' },
            creditsRemaining: { type: 'number', description: 'Number of credits remaining', example: '2' }
          }
        }
      },
      {
        template_key: 'credits-exhausted',
        category: 'credit',
        name: 'Credits Exhausted',
        description: 'Sent when a student has used all their lesson credits',
        default_subject: 'All Lesson Credits Used - Time to Restock!',
        available_variables: {
          user: {
            studentName: { type: 'string', description: 'Student\'s full name', example: 'John Smith' },
            studentEmail: { type: 'string', description: 'Student\'s email address', example: 'john@example.com' },
            totalLessonsCompleted: { type: 'number', description: 'Total lessons completed', example: '25' }
          }
        }
      },
      {
        template_key: 'absence-notification',
        category: 'booking',
        name: 'Absence Notification',
        description: 'Sent when a student misses a scheduled lesson',
        default_subject: 'Lesson Update - Book Your Next Session',
        available_variables: {
          user: {
            studentName: { type: 'string', description: 'Student\'s full name', example: 'John Smith' },
            studentEmail: { type: 'string', description: 'Student\'s email address', example: 'john@example.com' }
          },
          lesson: {
            lessonDate: { type: 'date', description: 'Missed lesson date', example: 'Monday, January 15, 2024' },
            startTime: { type: 'time', description: 'Lesson start time', example: '2:00 PM' },
            endTime: { type: 'time', description: 'Lesson end time', example: '3:00 PM' },
            instructorName: { type: 'string', description: 'Instructor\'s name', example: 'Sarah Johnson' },
            duration: { type: 'number', description: 'Lesson duration in minutes', example: '60' }
          },
          booking: {
            bookingId: { type: 'string', description: 'Unique booking identifier', example: '12345' },
            attendanceNotes: { type: 'string', description: 'Notes about the absence', example: 'Student did not attend' }
          }
        }
      },
      {
        template_key: 'rescheduling-student',
        category: 'booking',
        name: 'Rescheduling Notification (Student)',
        description: 'Sent to students when their lesson has been rescheduled',
        default_subject: 'Lesson Rescheduled - Updated Booking',
        available_variables: {
          user: {
            studentName: { type: 'string', description: 'Student\'s full name', example: 'John Smith' },
            studentEmail: { type: 'string', description: 'Student\'s email address', example: 'john@example.com' },
            instructorName: { type: 'string', description: 'Instructor\'s name', example: 'Sarah Johnson' }
          },
          oldLesson: {
            oldDate: { type: 'date', description: 'Original lesson date', example: 'Monday, January 15, 2024' },
            oldStartTime: { type: 'time', description: 'Original start time', example: '2:00 PM' },
            oldEndTime: { type: 'time', description: 'Original end time', example: '3:00 PM' },
            oldDuration: { type: 'number', description: 'Original duration in minutes', example: '60' }
          },
          newLesson: {
            newDate: { type: 'date', description: 'New lesson date', example: 'Tuesday, January 16, 2024' },
            newStartTime: { type: 'time', description: 'New start time', example: '3:00 PM' },
            newEndTime: { type: 'time', description: 'New end time', example: '4:00 PM' },
            newDuration: { type: 'number', description: 'New duration in minutes', example: '60' }
          },
          booking: {
            bookingId: { type: 'string', description: 'Unique booking identifier', example: '12345' }
          }
        }
      },
      {
        template_key: 'rescheduling-instructor',
        category: 'booking',
        name: 'Rescheduling Notification (Instructor)',
        description: 'Sent to instructors when a lesson has been rescheduled',
        default_subject: 'Lesson Rescheduled - Student Updated Booking',
        available_variables: {
          user: {
            studentName: { type: 'string', description: 'Student\'s full name', example: 'John Smith' },
            instructorName: { type: 'string', description: 'Instructor\'s name', example: 'Sarah Johnson' },
            instructorEmail: { type: 'string', description: 'Instructor\'s email address', example: 'sarah@example.com' }
          },
          oldLesson: {
            oldDate: { type: 'date', description: 'Original lesson date', example: 'Monday, January 15, 2024' },
            oldStartTime: { type: 'time', description: 'Original start time', example: '2:00 PM' },
            oldEndTime: { type: 'time', description: 'Original end time', example: '3:00 PM' },
            oldDuration: { type: 'number', description: 'Original duration in minutes', example: '60' }
          },
          newLesson: {
            newDate: { type: 'date', description: 'New lesson date', example: 'Tuesday, January 16, 2024' },
            newStartTime: { type: 'time', description: 'New start time', example: '3:00 PM' },
            newEndTime: { type: 'time', description: 'New end time', example: '4:00 PM' },
            newDuration: { type: 'number', description: 'New duration in minutes', example: '60' }
          },
          booking: {
            bookingId: { type: 'string', description: 'Unique booking identifier', example: '12345' }
          }
        }
      }
    ];

    // Read template files and populate database
    const templateRecords = [];
    
    for (const templateDef of templateDefinitions) {
      try {
        // Read the template file content
        const templatePath = path.join(__dirname, '..', 'email-templates', 'contents', `${templateDef.template_key}.html`);
        const bodyContent = await fs.readFile(templatePath, 'utf8');
        
        templateRecords.push({
          template_key: templateDef.template_key,
          category: templateDef.category,
          name: templateDef.name,
          description: templateDef.description,
          subject_template: templateDef.default_subject,
          body_template: bodyContent,
          default_subject_template: templateDef.default_subject,
          default_body_template: bodyContent,
          available_variables: JSON.stringify(templateDef.available_variables),
          is_active: true,
          last_edited_by: null,
          created_at: new Date(),
          updated_at: new Date()
        });
        
        console.log(`✓ Loaded template: ${templateDef.template_key}`);
      } catch (error) {
        console.error(`✗ Failed to load template ${templateDef.template_key}:`, error.message);
        // Continue with other templates even if one fails
      }
    }

    if (templateRecords.length > 0) {
      await queryInterface.bulkInsert('email_templates', templateRecords);
      console.log(`✓ Successfully seeded ${templateRecords.length} email templates`);
    } else {
      console.log('✗ No templates were loaded - check file paths and permissions');
    }
  },

  async down(queryInterface, Sequelize) {
    // Remove all seeded templates
    await queryInterface.bulkDelete('email_templates', null, {});
    console.log('✓ Removed all email templates');
  }
};
