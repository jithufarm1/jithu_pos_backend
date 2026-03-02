import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { ServiceTicketService } from '../../services/service-ticket.service';
import { TicketSummary, TicketStatus } from '../../../../core/models/service-ticket.model';
import { CustomerService } from '../../../customer/services/customer.service';

@Component({
  selector: 'app-ticket-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ticket-list.component.html',
  styleUrls: ['./ticket-list.component.css']
})
export class TicketListComponent implements OnInit, OnDestroy {
  tickets: TicketSummary[] = [];
  filteredTickets: TicketSummary[] = [];
  paginatedTickets: TicketSummary[] = [];
  
  // Search and filter state
  searchQuery = '';
  selectedStatus: TicketStatus | '' = '';
  selectedTechnician = '';
  startDate = '';
  endDate = '';
  
  // Pagination state
  currentPage = 1;
  pageSize = 50;
  totalPages = 1;
  
  // UI state
  isLoading = false;
  error: string | null = null;
  
  // Available filter options
  statusOptions: (TicketStatus | '')[] = ['', 'Created', 'In_Progress', 'Completed', 'Paid'];
  technicians: { id: string; name: string }[] = [];
  
  private destroy$ = new Subject<void>();
  private searchSubject$ = new Subject<string>();

  constructor(
    private serviceTicketService: ServiceTicketService,
    private router: Router,
    private customerService: CustomerService
  ) {}

  ngOnInit(): void {
    this.loadTickets();
    this.loadTechnicians();
    this.setupSearchDebounce();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupSearchDebounce(): void {
    this.searchSubject$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.applyFilters();
      });
  }

  loadTickets(): void {
    this.isLoading = true;
    this.error = null;

    this.serviceTicketService.searchTickets({})
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (tickets) => {
          this.tickets = tickets;
          this.applyFilters();
          this.isLoading = false;
        },
        error: (err) => {
          this.error = 'Failed to load tickets. Please try again.';
          console.error('Error loading tickets:', err);
          this.isLoading = false;
        }
      });
  }

  private loadTechnicians(): void {
    // Load technicians from auth service or employee service
    // For now, extract unique technicians from tickets
    const uniqueTechs = new Map<string, string>();
    this.tickets.forEach(ticket => {
      if (ticket.assignedTechnician) {
        uniqueTechs.set(ticket.assignedTechnician, ticket.assignedTechnician);
      }
    });
    
    this.technicians = Array.from(uniqueTechs.entries()).map(([id, name]) => ({
      id,
      name
    }));
  }

  onSearchChange(query: string): void {
    this.searchQuery = query;
    this.searchSubject$.next(query);
  }

  onStatusFilterChange(): void {
    this.applyFilters();
  }

  onTechnicianFilterChange(): void {
    this.applyFilters();
  }

  onDateRangeChange(): void {
    this.applyFilters();
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedStatus = '';
    this.selectedTechnician = '';
    this.startDate = '';
    this.endDate = '';
    this.applyFilters();
  }

  private applyFilters(): void {
    let filtered = [...this.tickets];

    // Apply search filter (ticket number, customer name, vehicle info)
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(ticket =>
        ticket.ticketNumber.toLowerCase().includes(query) ||
        ticket.customerName.toLowerCase().includes(query) ||
        ticket.vehicleInfo.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (this.selectedStatus) {
      filtered = filtered.filter(ticket => ticket.status === this.selectedStatus);
    }

    // Apply technician filter
    if (this.selectedTechnician) {
      filtered = filtered.filter(ticket => ticket.assignedTechnician === this.selectedTechnician);
    }

    // Apply date range filter
    if (this.startDate) {
      filtered = filtered.filter(ticket => ticket.createdDate >= this.startDate);
    }
    if (this.endDate) {
      filtered = filtered.filter(ticket => ticket.createdDate <= this.endDate);
    }

    // Sort by creation date descending (newest first)
    filtered.sort((a, b) => {
      return new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime();
    });

    this.filteredTickets = filtered;
    this.currentPage = 1;
    this.updatePagination();
  }

  private updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredTickets.length / this.pageSize);
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedTickets = this.filteredTickets.slice(startIndex, endIndex);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  nextPage(): void {
    this.goToPage(this.currentPage + 1);
  }

  previousPage(): void {
    this.goToPage(this.currentPage - 1);
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;
    
    let startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(this.totalPages, startPage + maxPagesToShow - 1);
    
    if (endPage - startPage < maxPagesToShow - 1) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  viewTicket(ticketId: string): void {
    this.router.navigate(['/tickets', ticketId]);
  }

  createNewTicket(): void {
    this.router.navigate(['/tickets/new']);
  }

  printWorkOrder(ticketId: string, event: Event): void {
    event.stopPropagation();
    
    // First get the full ticket to access customerId
    this.serviceTicketService.getTicketById(ticketId)
      .pipe(
        switchMap((ticket) => {
          if (!ticket) {
            throw new Error('Ticket not found');
          }
          // Then get customer data
          return this.customerService.getCustomerById(ticket.customerId)
            .pipe(
              switchMap((customer) => {
                if (!customer) {
                  throw new Error('Customer not found');
                }
                return this.serviceTicketService.printWorkOrder(
                  ticketId,
                  customer.firstName + ' ' + customer.lastName,
                  customer.phone,
                  customer.email
                );
              })
            );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (success) => {
          if (!success) {
            console.error('Failed to print work order');
            this.error = 'Failed to print work order. Please try again.';
          }
        },
        error: (err) => {
          console.error('Error printing work order:', err);
          this.error = 'Failed to print work order. Please try again.';
        }
      });
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

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }
}
