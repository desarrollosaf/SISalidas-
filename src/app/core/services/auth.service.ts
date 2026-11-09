import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Capacidades {
  validar: boolean;
  reportes: boolean;
  reporteGeneral: boolean;
  administrar: boolean;
}

export interface AuthUser {
  id: number;
  rfc: string;
  nombre: string;
  rol: string;
  capacidades: Capacidades;
}

interface LoginResponse {
  access_token: string;
  user: AuthUser;
}

const TOKEN_KEY = 'salidas_token';
const USER_KEY = 'salidas_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  readonly currentUser = signal<AuthUser | null>(this.leerUsuario());

  login(rfc: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`, { rfc, password }).pipe(
      tap(({ access_token, user }) => {
        localStorage.setItem(TOKEN_KEY, access_token);
        this.guardarUsuario(user);
      }),
    );
  }

  /** Vuelve a pedir el usuario: sus capacidades cambian si le asignan o quitan un área. */
  refrescar(): void {
    this.http.get<AuthUser>(`${environment.apiUrl}/auth/me`).subscribe((user) => this.guardarUsuario(user));
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.currentUser.set(null);
  }

  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  get isAuthenticated(): boolean {
    return !!this.token;
  }

  private guardarUsuario(user: AuthUser): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this.currentUser.set(user);
  }

  private leerUsuario(): AuthUser | null {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  }
}
