import { Component, OnInit } from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {Observable} from 'rxjs';
import {AutomataService, Automaton} from '../automata.service';
import {UntilDestroy, untilDestroyed} from '@ngneat/until-destroy';
import {map, switchMap} from 'rxjs/operators';

@UntilDestroy()
@Component({
  selector: 'app-automaton-detail',
  templateUrl: './automaton-detail.component.html',
  styleUrls: ['./automaton-detail.component.scss']
})
export class AutomatonDetailComponent implements OnInit {
  automaton: Automaton;

  constructor(
    private activatedRoute: ActivatedRoute,
    private automataService: AutomataService
  ) { }

  ngOnInit(): void {
    this.activatedRoute.paramMap.pipe(
      untilDestroyed(this),
      switchMap(paramMap => this.automataService.getAutomatonByName(paramMap.get('automatonName')))
    ).subscribe(automaton => this.automaton = automaton);
  }

}
