import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';

import {AutomataRoutingModule} from './automata-routing.module';
import {AutomataComponent} from './automata.component';
import {AutomatonDialogComponent} from './automaton-dialog/automaton-dialog.component';
import {SharedModule} from '../shared/shared.module';
import {MatFormFieldModule} from '@angular/material/form-field';
import {ReactiveFormsModule} from '@angular/forms';
import { AutomatonDetailComponent } from './automaton-detail/automaton-detail.component';


@NgModule({
  declarations: [
    AutomataComponent,
    AutomatonDialogComponent,
    AutomatonDetailComponent
  ],
  imports: [
    CommonModule,
    AutomataRoutingModule,
    SharedModule
  ]
})
export class AutomataModule {
}
