/**
 * Notification Service
 * 
 * Handles appointment notifications via SMS and email:
 * - Confirmation notifications
 * - Reminder notifications
 * - Cancellation notifications
 * - Reschedule notifications
 * - Technician notifications
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Appointment, NotificationTemplate, NotificationType } from '../../../core/models/appointment.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private readonly apiUrl = `${environment.apiBaseUrl}/notifications`;

  constructor(private http: HttpClient) {}

  /**
   * Send appointment confirmation notification
   */
  sendAppointmentConfirmation(appointment: Appointment): Observable<boolean> {
    console.log('[NotificationService] Sending confirmation for appointment:', appointment.id);

    const template = this.getNotificationTemplate('confirmation');
    const message = this.formatNotification(template, appointment);

    return this.sendNotification({
      type: 'confirmation',
      appointmentId: appointment.id,
      customerId: appointment.customerId,
      subject: template.subject,
      message,
      contactMethod: 'email', // Would be retrieved from customer preferences
    });
  }

  /**
   * Send appointment reminder notification (24 hours before)
   */
  sendAppointmentReminder(appointment: Appointment): Observable<boolean> {
    console.log('[NotificationService] Sending reminder for appointment:', appointment.id);

    const template = this.getNotificationTemplate('reminder');
    const message = this.formatNotification(template, appointment);

    return this.sendNotification({
      type: 'reminder',
      appointmentId: appointment.id,
      customerId: appointment.customerId,
      subject: template.subject,
      message,
      contactMethod: 'sms', // Reminders typically via SMS
    });
  }

  /**
   * Send cancellation notice
   */
  sendCancellationNotice(appointment: Appointment): Observable<boolean> {
    console.log('[NotificationService] Sending cancellation notice for appointment:', appointment.id);

    const template = this.getNotificationTemplate('cancellation');
    const message = this.formatNotification(template, appointment);

    return this.sendNotification({
      type: 'cancellation',
      appointmentId: appointment.id,
      customerId: appointment.customerId,
      subject: template.subject,
      message,
      contactMethod: 'email',
    });
  }

  /**
   * Send reschedule notice
   */
  sendRescheduleNotice(appointment: Appointment, oldDateTime: Date): Observable<boolean> {
    console.log('[NotificationService] Sending reschedule notice for appointment:', appointment.id);

    const template = this.getNotificationTemplate('reschedule');
    const message = this.formatNotification(template, appointment, { oldDateTime });

    return this.sendNotification({
      type: 'reschedule',
      appointmentId: appointment.id,
      customerId: appointment.customerId,
      subject: template.subject,
      message,
      contactMethod: 'email',
    });
  }

  /**
   * Send technician notification (assignment or check-in)
   */
  sendTechnicianNotification(technicianId: string, appointment: Appointment, notificationType: 'technician-assignment' | 'check-in'): Observable<boolean> {
    console.log('[NotificationService] Sending technician notification:', notificationType);

    const template = this.getNotificationTemplate(notificationType);
    const message = this.formatNotification(template, appointment);

    return this.sendNotification({
      type: notificationType,
      appointmentId: appointment.id,
      technicianId,
      subject: template.subject,
      message,
      contactMethod: 'sms', // Technician notifications via SMS
    });
  }

  /**
   * Schedule reminder notification (24 hours before appointment)
   */
  scheduleReminder(appointment: Appointment): Observable<void> {
    console.log('[NotificationService] Scheduling reminder for appointment:', appointment.id);

    const scheduledDateTime = new Date(appointment.scheduledDateTime);
    const reminderTime = new Date(scheduledDateTime);
    reminderTime.setHours(reminderTime.getHours() - 24);

    return this.http.post<void>(`${this.apiUrl}/schedule`, {
      appointmentId: appointment.id,
      notificationType: 'reminder',
      scheduledTime: reminderTime.toISOString(),
    }).pipe(
      map(() => {
        console.log('[NotificationService] Reminder scheduled');
        return undefined;
      }),
      catchError((error) => {
        console.error('[NotificationService] Failed to schedule reminder:', error);
        return of(undefined);
      })
    );
  }

  /**
   * Cancel scheduled reminder
   */
  cancelScheduledReminder(appointmentId: string): Observable<void> {
    console.log('[NotificationService] Cancelling scheduled reminder for appointment:', appointmentId);

    return this.http.delete<void>(`${this.apiUrl}/schedule/${appointmentId}`).pipe(
      map(() => {
        console.log('[NotificationService] Scheduled reminder cancelled');
        return undefined;
      }),
      catchError((error) => {
        console.error('[NotificationService] Failed to cancel reminder:', error);
        return of(undefined);
      })
    );
  }

  /**
   * Get notification template by type
   */
  getNotificationTemplate(type: NotificationType): NotificationTemplate {
    const templates: Record<NotificationType, NotificationTemplate> = {
      confirmation: {
        type: 'confirmation',
        subject: 'Appointment Confirmation - Valvoline',
        body: `Dear {{customerName}},

Your appointment has been confirmed!

Appointment Details:
- Date & Time: {{dateTime}}
- Vehicle: {{vehicleInfo}}
- Services: {{services}}
- Service Bay: {{serviceBay}}
- Technician: {{technicianName}}

Location: Valvoline Service Center
Address: [Store Address]

If you need to reschedule or cancel, please call us at [Phone Number].

Thank you for choosing Valvoline!`,
        variables: ['customerName', 'dateTime', 'vehicleInfo', 'services', 'serviceBay', 'technicianName'],
      },
      reminder: {
        type: 'reminder',
        subject: 'Appointment Reminder - Tomorrow',
        body: `Hi {{customerName}},

This is a reminder about your appointment tomorrow:

Date & Time: {{dateTime}}
Vehicle: {{vehicleInfo}}
Services: {{services}}
Service Bay: {{serviceBay}}

See you tomorrow!
Valvoline Service Center`,
        variables: ['customerName', 'dateTime', 'vehicleInfo', 'services', 'serviceBay'],
      },
      cancellation: {
        type: 'cancellation',
        subject: 'Appointment Cancelled',
        body: `Dear {{customerName}},

Your appointment has been cancelled.

Original Appointment:
- Date & Time: {{dateTime}}
- Vehicle: {{vehicleInfo}}
- Services: {{services}}

Reason: {{cancellationReason}}

To schedule a new appointment, please call us at [Phone Number] or visit our website.

Thank you,
Valvoline Service Center`,
        variables: ['customerName', 'dateTime', 'vehicleInfo', 'services', 'cancellationReason'],
      },
      reschedule: {
        type: 'reschedule',
        subject: 'Appointment Rescheduled',
        body: `Dear {{customerName}},

Your appointment has been rescheduled.

Previous Date & Time: {{oldDateTime}}
New Date & Time: {{dateTime}}

Vehicle: {{vehicleInfo}}
Services: {{services}}
Service Bay: {{serviceBay}}

If you have any questions, please call us at [Phone Number].

Thank you,
Valvoline Service Center`,
        variables: ['customerName', 'oldDateTime', 'dateTime', 'vehicleInfo', 'services', 'serviceBay'],
      },
      'technician-assignment': {
        type: 'technician-assignment',
        subject: 'New Appointment Assignment',
        body: `Hi {{technicianName}},

You have been assigned to a new appointment:

Date & Time: {{dateTime}}
Customer: {{customerName}}
Vehicle: {{vehicleInfo}}
Services: {{services}}
Service Bay: {{serviceBay}}

Please review the appointment details in the system.`,
        variables: ['technicianName', 'dateTime', 'customerName', 'vehicleInfo', 'services', 'serviceBay'],
      },
      'check-in': {
        type: 'check-in',
        subject: 'Customer Checked In',
        body: `Hi {{technicianName}},

Your customer has checked in:

Customer: {{customerName}}
Vehicle: {{vehicleInfo}}
Services: {{services}}
Service Bay: {{serviceBay}}

Please proceed to the service bay.`,
        variables: ['technicianName', 'customerName', 'vehicleInfo', 'services', 'serviceBay'],
      },
    };

    return templates[type];
  }

  /**
   * Format notification with appointment data
   */
  formatNotification(template: NotificationTemplate, appointment: Appointment, additionalData?: any): string {
    let message = template.body;

    // Replace variables with actual data
    const replacements: Record<string, string> = {
      customerName: '[Customer Name]', // Would be fetched from customer data
      dateTime: this.formatDateTime(new Date(appointment.scheduledDateTime)),
      vehicleInfo: '[Vehicle Info]', // Would be fetched from vehicle data
      services: appointment.serviceTypes.join(', '),
      serviceBay: `Bay ${appointment.serviceBay}`,
      technicianName: '[Technician Name]', // Would be fetched from employee data
      cancellationReason: appointment.cancellationReason || 'Not specified',
      oldDateTime: additionalData?.oldDateTime ? this.formatDateTime(additionalData.oldDateTime) : '',
    };

    // Replace all variables
    for (const [key, value] of Object.entries(replacements)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      message = message.replace(regex, value);
    }

    return message;
  }

  /**
   * Send notification via API
   */
  private sendNotification(notification: any): Observable<boolean> {
    return this.http.post<{ success: boolean }>(`${this.apiUrl}/send`, notification).pipe(
      map((response) => {
        console.log('[NotificationService] Notification sent successfully');
        return response.success;
      }),
      catchError((error) => {
        console.error('[NotificationService] Failed to send notification:', error);
        return of(false);
      })
    );
  }

  /**
   * Format date/time for display
   */
  private formatDateTime(date: Date): string {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    };

    return date.toLocaleDateString('en-US', options);
  }
}
