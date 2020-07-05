import {NgModule} from '@angular/core';
import {Routes, RouterModule} from '@angular/router';

import {AutomataComponent} from './automata.component';
import {AutomatonDetailComponent} from './automaton-detail/automaton-detail.component';

const routes: Routes = [
  {
    path: '',
    component: AutomataComponent
  },
  {
    path: ':automatonName',
    component: AutomatonDetailComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AutomataRoutingModule {
}
