import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil, switchMap } from 'rxjs';
import { ServiceTicketService } from '../../services/service-ticket.service';
import { ServiceTicket, TicketStatus } from '../../../../core/models/service-ticket.model';
import { ServiceRecommendation } from '../../../../core/models/service-catalog.model';
import { NetworkDetectionService } from '../../../../core/services/network-detection.service';
import { CustomerService } from '../../../customer/services/customer.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-ticket-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ticket-detail.component.html',
  styleUrls: ['./ticket-detail.component.css']
})
export class TicketDetailComponent implements OnInit, OnDestroy {
  ticket: ServiceTicket | null = null;
  recommendations: ServiceRecommendation[] = [];
  
  // UI state
  isLoading = false;
  error: string | null = null;
  isOffline = false;
  hasPendingSync = false;
  
  // Action states
  isChangingStatus = false;
  isPrinting = false;
  
  private destroy$ = new Subject<void>();
  private ticketId: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private serviceTicketService: ServiceTicketService,
    private networkService: NetworkDetectionService,
    private customerService: CustomerService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.ticketId = this.route.snapshot.paramMap.get('id');
    
    if (this.ticketId) {
      this.loadTicket();
      this.loadRecommendations();
    } else {
      this.error = 'Invalid ticket ID';
    }
    
    // Monitor network status
    this.networkService.getNetworkStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe((status) => {
        this.isOffline = !status.isOnline;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadTicket(): void {
    if (!this.ticketId) return;
    
    this.isLoading = true;
    this.error = null;

    this.serviceTicketService.getTicketById(this.ticketId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (ticket) => {
          if (ticket) {
            this.ticket = ticket;
            this.checkPendingSync();
          } else {
            this.error = 'Ticket not found';
          }
          this.isLoading = false;
        },
        error: (err) => {
          this.error = 'Failed to load ticket. Please try again.';
          console.error('Error loading ticket:', err);
          this.isLoading = false;
        }
      });
  }

  private loadRecommendations(): void {
    if (!this.ticket) return;
    
    this.serviceTicketService.getServiceRecommendations(
      this.ticket.vehicleId,
      this.ticket.currentMileage
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (recommendations) => {
          this.recommendations = recommendations;
        },
        error: (err) => {
          console.error('Error loading recommendations:', err);
        }
      });
  }

  private checkPendingSync(): void {
    // Check if ticket has pending sync operations
    this.serviceTicketService.getPendingTicketCount()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (count) => {
          this.hasPendingSync = count > 0;
        },
        error: () => {
          this.hasPendingSync = false;
        }
      });
  }

  canEdit(): boolean {
    if (!this.ticket) return false;
    return this.ticket.status === 'Created' || this.ticket.status === 'In_Progress';
  }

  canStartWork(): boolean {
    if (!this.ticket) return false;
    return this.ticket.status === 'Created';
  }

  canCompleteWork(): boolean {
    if (!this.ticket) return false;
    return this.ticket.status === 'In_Progress';
  }

  canMarkPaid(): boolean {
    if (!this.ticket) return false;
    return this.ticket.status === 'Completed';
  }

  editTicket(): void {
    if (this.ticket && this.canEdit()) {
      this.router.navigate(['/tickets', this.ticket.id, 'edit']);
    }
  }

  startWork(): void {
    if (!this.ticket || !this.canStartWork()) return;
    
    this.isChangingStatus = true;
    
    const currentUser = this.authService.getCurrentEmployee();
    if (!currentUser) {
      this.error = 'User not authenticated';
      this.isChangingStatus = false;
      return;
    }
    
    this.serviceTicketService.startWork(
      this.ticket.id,
      currentUser.id,
      currentUser.name
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedTicket) => {
          if (updatedTicket) {
            this.ticket = updatedTicket;
          }
          this.isChangingStatus = false;
        },
        error: (err) => {
          this.error = 'Failed to start work. Please try again.';
          console.error('Error starting work:', err);
          this.isChangingStatus = false;
        }
      });
  }

  completeWork(): void {
    if (!this.ticket || !this.canCompleteWork()) return;
    
    this.isChangingStatus = true;
    
    const currentUser = this.authService.getCurrentEmployee();
    if (!currentUser) {
      this.error = 'User not authenticated';
      this.isChangingStatus = false;
      return;
    }
    
    this.serviceTicketService.completeWork(
      this.ticket.id,
      currentUser.id,
      currentUser.name
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedTicket) => {
          if (updatedTicket) {
            this.ticket = updatedTicket;
          }
          this.isChangingStatus = false;
        },
        error: (err) => {
          this.error = 'Failed to complete work. Please try again.';
          console.error('Error completing work:', err);
          this.isChangingStatus = false;
        }
      });
  }

  markPaid(): void {
    if (!this.ticket || !this.canMarkPaid()) return;
    
    this.isChangingStatus = true;
    
    const currentUser = this.authService.getCurrentEmployee();
    if (!currentUser) {
      this.error = 'User not authenticated';
      this.isChangingStatus = false;
      return;
    }
    
    this.serviceTicketService.markPaid(
      this.ticket.id,
      currentUser.id,
      currentUser.name
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedTicket) => {
          if (updatedTicket) {
            this.ticket = updatedTicket;
          }
          this.isChangingStatus = false;
        },
        error: (err) => {
          this.error = 'Failed to mark as paid. Please try again.';
          console.error('Error marking paid:', err);
          this.isChangingStatus = false;
        }
      });
  }

  printWorkOrder(): void {
    if (!this.ticket) return;
    
    this.isPrinting = true;
    
    // Fetch customer data to get phone and email
    this.customerService.getCustomerById(this.ticket.customerId)
      .pipe(
        switchMap((customer) => {
          if (!customer) {
            throw new Error('Customer not found');
          }
          return this.serviceTicketService.printWorkOrder(
            this.ticket!.id,
            customer.firstName + ' ' + customer.lastName,
            customer.phone,
            customer.email
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (success) => {
          if (!success) {
            this.error = 'Failed to print work order. Please try again.';
          }
          this.isPrinting = false;
        },
        error: (err) => {
          this.error = 'Failed to print work order. Please try again.';
          console.error('Error printing work order:', err);
          this.isPrinting = false;
        }
      });
  }

  backToList(): void {
    this.router.navigate(['/tickets']);
  }

  getStatusClass(status: TicketStatus): string {
    const statusClasses: Record<TicketStatus, string> = {
      'Created': 'status-created',
      'In_Progress': 'status-in-progress',
      'Completed': 'status-completed',
      'Paid': 'status-paid'
    };
    return statusClasses[status] || '';
  }

  getStatusLabel(status: TicketStatus): string {
    const statusLabels: Record<TicketStatus, string> = {
      'Created': 'Created',
      'In_Progress': 'In Progress',
      'Completed': 'Completed',
      'Paid': 'Paid'
    };
    return statusLabels[status] || status;
  }

  getPriorityClass(priority: string): string {
    const priorityClasses: Record<string, string> = {
      'High': 'priority-high',
      'Medium': 'priority-medium',
      'Low': 'priority-low'
    };
    return priorityClasses[priority] || '';
  }

  getTotalDiscounts(): number {
    if (!this.ticket || !this.ticket.discounts) return 0;
    return this.ticket.discounts.reduce((sum, d) => sum + d.amount, 0);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  formatLaborTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0 && mins > 0) {
      return `${hours}h ${mins}m`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return `${mins}m`;
    }
  }
}
