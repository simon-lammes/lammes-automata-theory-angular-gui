import { Component, OnInit } from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {AutomatonDialogComponent} from './automaton-dialog/automaton-dialog.component';
import {AutomataService, Automaton} from './automata.service';

@Component({
  selector: 'app-automata',
  templateUrl: './automata.component.html',
  styleUrls: ['./automata.component.scss']
})
export class AutomataComponent {
  automata$ = this.automataService.automata$;

  constructor(
    private readonly dialog: MatDialog,
    private readonly automataService: AutomataService
  ) { }

  createAutomaton(): void {
    this.dialog.open(AutomatonDialogComponent);
  }

  deleteAutomata(automata: Automaton): void {
    this.automataService.deleteAutomata(automata);
  }
}
