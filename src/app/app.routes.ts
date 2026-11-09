import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';
import { capacidadGuard } from './core/guards/capacidad.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/login/login').then((m) => m.Login),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell/shell').then((m) => m.Shell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'hoy' },
      {
        path: 'hoy',
        title: 'Hoy · Salidas',
        loadComponent: () => import('./features/hoy/hoy').then((m) => m.Hoy),
      },
      {
        path: 'salidas',
        title: 'Mis salidas · Salidas',
        loadComponent: () => import('./features/salidas/lista/lista').then((m) => m.ListaSalidas),
      },
      {
        path: 'salidas/nueva',
        title: 'Nueva salida · Salidas',
        loadComponent: () => import('./features/salidas/nueva/nueva').then((m) => m.NuevaSalida),
      },
      {
        path: 'salidas/:id',
        title: 'Permiso · Salidas',
        loadComponent: () =>
          import('./features/salidas/detalle/detalle').then((m) => m.DetalleSalida),
      },
      {
        path: 'validar',
        title: 'Por validar · Salidas',
        canActivate: [capacidadGuard('validar')],
        loadComponent: () => import('./features/validar/validar').then((m) => m.Validar),
      },
      {
        path: 'reportes',
        title: 'Reportes · Salidas',
        canActivate: [capacidadGuard('reportes')],
        loadComponent: () => import('./features/reportes/reportes').then((m) => m.Reportes),
      },
      {
        path: 'administracion',
        title: 'Administración · Salidas',
        canActivate: [capacidadGuard('administrar')],
        loadComponent: () =>
          import('./features/administracion/administracion').then((m) => m.Administracion),
      },
      {
        path: 'mi-cuenta',
        title: 'Mi cuenta · Salidas',
        loadComponent: () => import('./features/mi-cuenta/mi-cuenta').then((m) => m.MiCuenta),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
