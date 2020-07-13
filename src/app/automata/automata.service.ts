import {Injectable} from '@angular/core';
import {BehaviorSubject, Observable, of} from 'rxjs';
import {map, skip} from 'rxjs/operators';
import {UntilDestroy, untilDestroyed} from '@ngneat/until-destroy';
import {HttpClient} from '@angular/common/http';
import {environment} from '../../environments/environment';
import {moveItemInArray} from '@angular/cdk/drag-drop';

export interface Transition {
  state: string;
  input: string;
  next_state: string;
}

/**
 * Tests the automaton with an example input and the expectation that the automaton
 * either accepts or rejects the input.
 */
export interface TestCase {
  test_input: string;
  /**
   * Whether the automaton should accept the input.
   */
  expectation: boolean;
}

export interface Automaton {
  name: string;
  start_state?: string;
  accept_states?: string[];
  transitions?: Transition[];
  test_cases?: TestCase[];
}

export interface TestCaseResult {
  testCase: TestCase;
  wasTestSuccessful: boolean;
}

interface CheckRcpCall {
  id: number;
  jsonrpc: '2.0';
  method: 'check';
  params: [
    Automaton,
    string
  ];
}

interface CheckRcpResponse {
  id: number;
  jsonrpc: '2.0';
  /**
   * The first value is whether the input has been accepted by the automaton.
   * The second value is an array of all states that the automaton has visited during execution.
   */
  result: [
    boolean,
    string[]
  ];
  /**
   * Only defined if an error happened.
   */
  error: any;
}

@UntilDestroy()
@Injectable({
  providedIn: 'root'
})
// @ts-ignore
export class AutomataService {
  automataBehaviourSubject: BehaviorSubject<Automaton[]>;
  automata$: Observable<Automaton[]>;

  constructor(
    private httpClient: HttpClient
  ) {
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
    this.updateAutomaton(mutatedAutomaton.name, (automaton: Automaton) => {
      automaton.transitions = [...automaton.transitions ?? [], transition];
    });
  }

  removeTransitionFromAutomaton(mutatedAutomaton: Automaton, transitionIndex: number): void {
    this.updateAutomaton(mutatedAutomaton.name, (automaton: Automaton) => {
      automaton.transitions = automaton.transitions.filter((value, index) => index !== transitionIndex);
    });
  }

  removeStateFromAutomaton(mutatedAutomaton: Automaton, removedState: string): void {
    this.updateAutomaton(mutatedAutomaton.name, (automaton: Automaton) => {
      automaton.transitions = automaton.transitions?.filter(transition =>
        transition.state !== removedState && transition.next_state !== removedState) ?? [];
    });
  }

  addTestCaseToAutomaton(mutatedAutomaton: Automaton, testCase: TestCase): void {
    this.updateAutomaton(mutatedAutomaton.name, (automaton: Automaton) => {
      automaton.test_cases = [...automaton.test_cases ?? [], testCase];
    });
  }

  performTestsForAutomaton(automaton: Automaton): Observable<TestCaseResult[]> {
    if (!(automaton.test_cases?.length > 0)) {
      return of([]);
    }
    const rpcCalls = automaton.test_cases.map((testCase, index) => {
      return {
        jsonrpc: '2.0',
        method: 'check',
        id: index,
        params: [
          automaton,
          testCase.test_input
        ]
      } as CheckRcpCall;
    });
    return this.httpClient.post<CheckRcpResponse[]>(environment.backendUrl, rpcCalls).pipe(
      map(responses => {
        return responses.map(response => {
          const hasInputBeenAccepted = response.error ? false : response.result[0];
          const testCase = automaton.test_cases[response.id];
          return {
            wasTestSuccessful: hasInputBeenAccepted === testCase.expectation,
            testCase
          };
        }) as TestCaseResult[];
      })
    );
  }

  setStartState(mutatedAutomaton: Automaton, newStartState: string): void {
    this.updateAutomaton(mutatedAutomaton.name, (automaton: Automaton) => {
      automaton.start_state = newStartState;
    });
  }

  addAcceptState(mutatedAutomaton: Automaton, newAcceptState: string): void {
    this.updateAutomaton(mutatedAutomaton.name, (automaton: Automaton) => {
      automaton.accept_states = [...automaton.accept_states ?? [], newAcceptState];
    });
  }

  removeTestCaseFromAutomaton(mutatedAutomaton: Automaton, removedTestCaseIndex: number): void {
    this.updateAutomaton(mutatedAutomaton.name, (automaton: Automaton) => {
      automaton.test_cases = automaton.test_cases?.filter((testCase, index) =>
        index !== removedTestCaseIndex) ?? [];
    });
  }

  removeAcceptState(mutatedAutomaton: Automaton, previouslyAcceptingState: string): void {
    this.updateAutomaton(mutatedAutomaton.name, (automaton: Automaton) => {
      automaton.accept_states = automaton.accept_states?.filter(state => state !== previouslyAcceptingState) ?? [];
    });
  }

  /**
   * Finds the automaton which should be updated by name.
   * Then performs to provided mutation on that automaton and then saves the changes.
   * @param mutatedAutomatonName the name of the updated automaton which should be a **unique** identifier.
   * @param mutation the operation that will update the automaton
   */
  private updateAutomaton(mutatedAutomatonName: string, mutation: (Automaton) => void): void {
    this.automataBehaviourSubject.next(
      this.automataBehaviourSubject.value.map(automaton => {
        if (automaton.name !== mutatedAutomatonName) {
          return automaton;
        }
        mutation(automaton);
        return automaton;
      })
    );
  }

  changeTestCaseOrder(mutatedAutomaton: Automaton, previousIndex: number, currentIndex: number): void {
    this.updateAutomaton(mutatedAutomaton.name, (automaton: Automaton) => {
      moveItemInArray(automaton.test_cases, previousIndex, currentIndex);
    });
  }
}
