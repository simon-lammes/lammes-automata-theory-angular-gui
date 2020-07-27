import {Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {Automaton, TestCaseResult} from '../automata.service';
import {BehaviorSubject, combineLatest, Observable} from 'rxjs';
import {map} from 'rxjs/operators';

export interface SimulationDialogData {
  result$: Observable<TestCaseResult>;
  automaton$: Observable<Automaton>;
}

@Component({
  selector: 'app-simulation-dialog',
  templateUrl: './simulation-dialog.component.html',
  styleUrls: ['./simulation-dialog.component.scss']
})
export class SimulationDialogComponent implements OnInit {
  automaton$: Observable<Automaton>;
  testCaseResult$: Observable<TestCaseResult>;
  currentStepBehaviourSubject: BehaviorSubject<number>;
  /**
   * In which step the current simulation is. Starts with 0 and increments as the user proceeds.
   */
  currentStep$: Observable<number>;
  /**
   * The state corresponding to the current step.
   */
  currentState$: Observable<string>;
  /**
   * Whether the user can validly increment the current step to go forth.
   * False, if the user has already reached the end of the simulation.
   */
  isNextStepAvailable$: Observable<boolean>;
  /**
   * Whether the user can validly decrement the current step to go back.
   * False, if the user is currently at the beginning of the simulation.
   */
  isPreviousStepAvailable$: Observable<boolean>;
  /**
   * The input symbols that are already processed at the current step of the simulation.
   */
  processedInput$: Observable<string>;
  /**
   * The upcoming input symbols that are about to be processed in this simulation.
   */
  upcomingInput$: Observable<string>;
  /**
   * A textual explanation of the next step to help the user understand the next transition.
   */
  nextStepExplanation$: Observable<string>;

  constructor(
    private readonly dialogRef: MatDialogRef<SimulationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) private readonly data: SimulationDialogData,
  ) {
  }

  ngOnInit(): void {
    this.automaton$ = this.data.automaton$;
    this.testCaseResult$ = this.data.result$;
    this.currentStepBehaviourSubject = new BehaviorSubject<number>(0);
    this.currentStep$ = this.currentStepBehaviourSubject.asObservable();
    this.currentState$ = combineLatest([
      this.testCaseResult$,
      this.currentStep$
    ]).pipe(
      map(([testCaseResult, step]) => testCaseResult.visitedStates[step])
    );
    this.isNextStepAvailable$ = combineLatest([
      this.testCaseResult$,
      this.currentStep$
    ]).pipe(
      map(([testCaseResult, step]) => testCaseResult.visitedStates.length > step + 1)
    );
    this.isPreviousStepAvailable$ = this.currentStep$.pipe(map(step => step > 0));
    this.upcomingInput$ = combineLatest([
      this.testCaseResult$,
      this.currentStep$
    ]).pipe(
      map(([testCaseResult, step]) => testCaseResult.testCase.test_input.substr(step))
    );
    this.processedInput$ = combineLatest([
      this.testCaseResult$,
      this.currentStep$
    ]).pipe(
      map(([testCaseResult, step]) => testCaseResult.testCase.test_input.substr(0, step))
    );
    this.nextStepExplanation$ = combineLatest([
      this.testCaseResult$,
      this.currentStep$
    ]).pipe(
      map(([testCaseResult, step]) => {
        const isLastStateVisited = testCaseResult.visitedStates.length === step + 1;
        const currentState = testCaseResult.visitedStates[step];
        if (!isLastStateVisited) {
          const inputCharacter = testCaseResult.testCase.test_input.charAt(step);
          const nextState = testCaseResult.visitedStates[step + 1];
          return `Reading the input character '${inputCharacter}' in state '${currentState}' will lead the automaton to transition to state '${nextState}'`;
        }
        const areThereUnprocessableInputCharacters = testCaseResult.testCase.test_input.length > testCaseResult.visitedStates.length - 1;
        if (!areThereUnprocessableInputCharacters) {
          return 'There no more input characters to process. ' + (testCaseResult.hasInputBeenAccepted ? `The automaton is in the accepting state '${currentState}' and thus accepted the input.` : `The automaton is in the rejecting state '${currentState}' and thus rejected the input.`);
        }
        return `In the current state '${currentState}', there is no transition for the next character '${testCaseResult.testCase.test_input.charAt(step)}' which is why the automaton rejects the input.`;
      })
    );
  }

  cancel(): void {
    this.dialogRef.close();
  }

  previous(): void {
    const currentStep = this.currentStepBehaviourSubject.value;
    const previousStep = currentStep - 1;
    this.currentStepBehaviourSubject.next(previousStep);
  }

  next(): void {
    const currentStep = this.currentStepBehaviourSubject.value;
    const nextStep = currentStep + 1;
    this.currentStepBehaviourSubject.next(nextStep);
  }
}
