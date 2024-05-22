import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { GraphComponent } from './graph/graph.component';
import { FormsModule } from '@angular/forms';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MatTooltipModule } from '@angular/material/tooltip';

@NgModule({
  declarations: [
    AppComponent,
    GraphComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    MatTooltipModule
  ],
  providers: [
    provideAnimationsAsync()
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
