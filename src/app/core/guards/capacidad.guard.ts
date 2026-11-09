import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, Capacidades } from '../services/auth.service';

/** Solo decide qué se muestra: quien protege de verdad los datos es el backend. */
export const capacidadGuard =
  (capacidad: keyof Capacidades): CanActivateFn =>
  () => {
    const auth = inject(AuthService);
    if (auth.currentUser()?.capacidades[capacidad]) return true;
    return inject(Router).parseUrl('/hoy');
  };
