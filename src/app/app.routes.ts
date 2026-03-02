import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/components/login/login.component';
import { HomeComponent } from './features/home/components/home/home.component';
import { VehicleSearchContainerComponent } from './features/vehicle/components/vehicle-search-container/vehicle-search-container.component';
import { CustomerSearchComponent } from './features/customer/components/customer-search/customer-search.component';
import { CustomerDetailComponent } from './features/customer/components/customer-detail/customer-detail.component';
import { CustomerFormComponent } from './features/customer/components/customer-form/customer-form.component';
import { DataManagementComponent } from './features/settings/components/data-management/data-management.component';
import { TicketFormComponent } from './features/service-ticket/components/ticket-form/ticket-form.component';
import { TicketListComponent } from './features/service-ticket/components/ticket-list/ticket-list.component';
import { TicketDetailComponent } from './features/service-ticket/components/ticket-detail/ticket-detail.component';
import { AppointmentFormComponent } from './features/appointments/components/appointment-form/appointment-form.component';
import { authGuard } from './core/guards/auth.guard';
import { managerGuard } from './core/guards/manager.guard';

/**
 * Application Routes
 */
export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: 'home',
    component: HomeComponent,
    canActivate: [authGuard],
  },
  {
    path: 'vehicle-search',
    component: VehicleSearchContainerComponent,
    canActivate: [authGuard],
  },
  {
    path: 'customers',
    component: CustomerSearchComponent,
    canActivate: [authGuard],
  },
  {
    path: 'customers/new',
    component: CustomerFormComponent,
    canActivate: [authGuard],
  },
  {
    path: 'customers/:id',
    component: CustomerDetailComponent,
    canActivate: [authGuard],
  },
  {
    path: 'customers/:id/edit',
    component: CustomerFormComponent,
    canActivate: [authGuard],
  },
  {
    path: 'tickets',
    component: TicketListComponent,
    canActivate: [authGuard],
  },
  {
    path: 'tickets/new',
    component: TicketFormComponent,
    canActivate: [authGuard],
  },
  {
    path: 'tickets/:id',
    component: TicketDetailComponent,
    canActivate: [authGuard],
  },
  {
    path: 'tickets/:id/edit',
    component: TicketFormComponent,
    canActivate: [authGuard],
  },
  {
    path: 'appointments/new',
    component: AppointmentFormComponent,
    canActivate: [authGuard],
  },
  {
    path: 'cache-demo',
    loadComponent: () => import('./features/vehicle/components/cache-demo/cache-demo.component')
      .then(m => m.CacheDemoComponent),
    canActivate: [authGuard]
  },
  {
    path: 'settings/data-management',
    component: DataManagementComponent,
    canActivate: [authGuard, managerGuard],
  },
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: '/login',
  },
];
