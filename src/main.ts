import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { importProvidersFrom } from '@angular/core';
import { ServiceWorkerModule } from '@angular/service-worker';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { environment } from './environments/environment';
import { authInterceptor } from './app/core/interceptors/auth.interceptor';

/**
 * Bootstrap the Angular application
 * Configures HTTP client, Router, and Service Worker for PWA functionality
 */
bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    importProvidersFrom(
      ServiceWorkerModule.register('ngsw-worker.js', {
        enabled: environment.production,
        registrationStrategy: 'registerWhenStable:30000',
      })
    ),
  ],
}).catch((err) => console.error(err));
