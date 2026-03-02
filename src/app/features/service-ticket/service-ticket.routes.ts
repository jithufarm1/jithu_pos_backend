import { Routes } from '@angular/router';
import { AuthGuard } from '../../core/guards/auth.guard';

export const SERVICE_TICKET_ROUTES: Routes = [
  {
    path: '',
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./components/ticket-list/ticket-list.component').then(
            (m) => m.TicketListComponent
          ),
        title: 'Service Tickets'
      },
      {
        path: 'new',
        loadComponent: () =>
          import('./components/ticket-form/ticket-form.component').then(
            (m) => m.TicketFormComponent
          ),
        title: 'Create Service Ticket'
      },
      {
        path: ':id',
        loadComponent: () =>
          import('./components/ticket-detail/ticket-detail.component').then(
            (m) => m.TicketDetailComponent
          ),
        title: 'Service Ticket Details'
      },
      {
        path: ':id/edit',
        loadComponent: () =>
          import('./components/ticket-form/ticket-form.component').then(
            (m) => m.TicketFormComponent
          ),
        title: 'Edit Service Ticket'
      }
    ]
  }
];
