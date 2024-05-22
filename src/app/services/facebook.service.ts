import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FacebookService {
  private accessToken = "733cd42d5b1d909b45a8cb2adef6e925";

  constructor(private http: HttpClient) {}

  getFriends(userId: string): Observable<any> {
    const url = `https://graph.facebook.com/${userId}/friends?access_token=${this.accessToken}`;
    return this.http.get<any>(url);
  }

  getUser(userId: string): Observable<any> {
    const url = `https://graph.facebook.com/${userId}?access_token=${this.accessToken}`;
    return this.http.get<any>(url);
  }
}
