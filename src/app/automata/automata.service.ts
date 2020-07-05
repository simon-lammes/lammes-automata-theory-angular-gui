import {Injectable} from '@angular/core';
import {BehaviorSubject, Observable} from 'rxjs';
import {map, skip} from 'rxjs/operators';
import {UntilDestroy, untilDestroyed} from '@ngneat/until-destroy';

export interface Transition {
  state: string;
  input: string;
  next_state: string;
}

export interface Automaton {
  name: string;
  transitions?: Transition[];
}

@UntilDestroy()
@Injectable({
  providedIn: 'root'
})
// @ts-ignore
export class AutomataService {
  automataBehaviourSubject: BehaviorSubject<Automaton[]>;
  automata$: Observable<Automaton[]>;

  constructor() {
    // Retrieve all previously saved automata from localstorage.
    let savedAutomata: Automaton[];
    try {
      savedAutomata = JSON.parse(localStorage.getItem('automata'));
    } catch (e) {
      // If entry in localstorage cannot be found for whatever reason, we use an empty automata array as default.
      savedAutomata = [];
    }
    this.automataBehaviourSubject = new BehaviorSubject<Automaton[]>(savedAutomata);
    this.automata$ = this.automataBehaviourSubject.asObservable();
    // Whenever automata changes, we reflect those changes in localstorage, so that changes are persistent.
    this.automata$.pipe(
      skip(1),
      untilDestroyed(this)
    ).subscribe(automata => {
      localStorage.setItem('automata', JSON.stringify(automata));
    });
  }

  saveAutomaton(automaton: Automaton): void {
    this.automataBehaviourSubject.next([
      ...this.automataBehaviourSubject.value,
      automaton
    ]);
  }

  getAutomatonByName(name: string): Observable<Automaton> {
    return this.automata$.pipe(
      map(automata => automata.find(automaton => automaton.name === name))
    );
  }

  deleteAutomata(deletedAutomata: Automaton): void {
    this.automataBehaviourSubject.next(
      this.automataBehaviourSubject.value.filter(automata => automata.name !== deletedAutomata.name)
    );
  }

  addTransitionToAutomaton(mutatedAutomaton: Automaton, transition: Transition): void {
    this.automataBehaviourSubject.next(
      this.automataBehaviourSubject.value.map(automaton => {
        if (automaton.name !== mutatedAutomaton.name) {
          return automaton;
        }
        automaton.transitions = [...automaton.transitions ?? [], transition];
        return automaton;
      })
    );
  }

  removeTransitionFromAutomaton(mutatedAutomaton: Automaton, transitionIndex: number): void {
    this.automataBehaviourSubject.next(
      this.automataBehaviourSubject.value.map(automaton => {
        if (automaton.name !== mutatedAutomaton.name) {
          return automaton;
        }
        automaton.transitions = automaton.transitions.filter((value, index) => index !== transitionIndex);
        return automaton;
      })
    );
  }

  removeStateFromAutomaton(mutatedAutomaton: Automaton, removedState: string): void {
    this.automataBehaviourSubject.next(
      this.automataBehaviourSubject.value.map(automaton => {
        if (automaton.name !== mutatedAutomaton.name) {
          return automaton;
        }
        automaton.transitions = automaton.transitions?.filter(transition =>
          transition.state !== removedState && transition.next_state !== removedState) ?? [];
        return automaton;
      })
    );
  }
}
