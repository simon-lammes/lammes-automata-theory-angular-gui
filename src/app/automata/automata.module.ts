import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';

import {AutomataRoutingModule} from './automata-routing.module';
import {AutomataComponent} from './automata.component';
import {AutomatonDialogComponent} from './automaton-dialog/automaton-dialog.component';
import {SharedModule} from '../shared/shared.module';
import {AutomatonDetailComponent} from './automaton-detail/automaton-detail.component';
import {NgxGraphModule} from '@swimlane/ngx-graph';
import {DragDropModule} from '@angular/cdk/drag-drop';
import {MatListModule} from '@angular/material/list';
import {NgxChartsModule} from '@swimlane/ngx-charts';
import {MinimizationDialogComponent} from './minimization-dialog/minimization-dialog.component';

@NgModule({
  declarations: [
    AutomataComponent,
    AutomatonDialogComponent,
    AutomatonDetailComponent,
    MinimizationDialogComponent
  ],
  imports: [
    CommonModule,
    AutomataRoutingModule,
    SharedModule,
    NgxGraphModule,
    DragDropModule,
    MatListModule,
    NgxChartsModule
  ]
})
export class AutomataModule {
}
