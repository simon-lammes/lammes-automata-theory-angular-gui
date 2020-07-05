import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';


const routes: Routes = [
  {
    path: 'automata',
    loadChildren: () => import('./automata/automata.module').then(m => m.AutomataModule)
  },
  {
    path: '**',
    redirectTo: '/automata'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {
}
