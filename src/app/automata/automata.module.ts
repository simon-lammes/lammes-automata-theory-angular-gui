import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';

import {AutomataRoutingModule} from './automata-routing.module';
import {AutomataComponent} from './automata.component';
import {AutomatonDialogComponent} from './automaton-dialog/automaton-dialog.component';
import {SharedModule} from '../shared/shared.module';
import {AutomatonDetailComponent} from './automaton-detail/automaton-detail.component';
import {NgxGraphModule} from '@swimlane/ngx-graph';

@NgModule({
  declarations: [
    AutomataComponent,
    AutomatonDialogComponent,
    AutomatonDetailComponent
  ],
  imports: [
    CommonModule,
    AutomataRoutingModule,
    SharedModule,
    NgxGraphModule
  ]
})
export class AutomataModule {
}
