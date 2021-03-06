import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {AutomataService, Automaton, TestCase, TestCaseError, TestCaseResult, Transition} from '../automata.service';
import {UntilDestroy, untilDestroyed} from '@ngneat/until-destroy';
import {filter, first, map, pairwise, startWith, switchMap} from 'rxjs/operators';
import {AbstractControl, FormBuilder, FormGroup, Validators} from '@angular/forms';
import {combineLatest, Observable, of} from 'rxjs';
import {CdkDragDrop} from '@angular/cdk/drag-drop';
import {RxwebValidators} from '@rxweb/reactive-form-validators';
import {MatSnackBar} from '@angular/material/snack-bar';
import {MatDialog} from '@angular/material/dialog';
import {MinimizationDialogComponent} from '../minimization-dialog/minimization-dialog.component';
import {SimulationDialogComponent, SimulationDialogData} from '../simulation-dialog/simulation-dialog.component';

@UntilDestroy()
@Component({
  selector: 'app-automaton-detail',
  templateUrl: './automaton-detail.component.html',
  styleUrls: ['./automaton-detail.component.scss']
})
export class AutomatonDetailComponent implements OnInit {
  /**
   * The id of the link that comes "out of nowhere" to the start state, indicating where the start state is.
   */
  readonly START_LINK_ID = 'start';
  automaton$: Observable<Automaton>;
  /**
   * Nodes in the network graph.
   */
  nodes$: Observable<any[]>;
  /**
   * Links in the network graph.
   */
  links$: Observable<any[]>;
  testCaseResults$: Observable<TestCaseResult[]>;
  /**
   * If the transition form value is redundant, we prevent the user from adding that transition.
   */
  isTransitionFormValueRedundant$: Observable<boolean>;
  transitionForm: FormGroup;
  testCaseForm: FormGroup;
  /**
   * Determines which state or transition is currently selected. Undefined, if nothing is selected.
   * If it is a number, the number specifies the index of the selected transition.
   * If it is a string, that string is the name of the selected state.
   * I know that one should strive for more intuitive interfaces but I haven't found significantly better
   * solutions in TypeScript. In Rust of course, one could just create an enum `Selection` with the values
   * `StateSelection` and `TransitionSelection`, where StateSelection holds a string and TransitionSelection holds a number.
   * This would be a very intuitive solution in my opinion, however, in TypeScript, we do not have that
   * powerful enums.
   */
  currentSelection: number | string;
  /**
   * Holds the first error found that has led to test cases not being executed properly.
   * If test cases could be executed properly, this will hold 'undefined'.
   */
  testCaseError$: Observable<TestCaseError>;

  constructor(
    private activatedRoute: ActivatedRoute,
    private automataService: AutomataService,
    private formBuilder: FormBuilder,
    private snackBar: MatSnackBar,
    private readonly dialog: MatDialog,
    private router: Router
  ) {
  }

  get stateControl(): AbstractControl {
    return this.transitionForm.controls.state;
  }

  get inputControl(): AbstractControl {
    return this.transitionForm.controls.input;
  }

  get nextStateControl(): AbstractControl {
    return this.transitionForm.controls.next_state;
  }

  get testInputControl(): AbstractControl {
    return this.testCaseForm?.controls.test_input;
  }

  get expectationControl(): AbstractControl {
    return this.testCaseForm?.controls.expectation;
  }

  ngOnInit(): void {
    this.automaton$ = this.activatedRoute.paramMap.pipe(
      switchMap(paramMap => this.automataService.getAutomatonByName(paramMap.get('automatonName')))
    );
    // The url might be incorrect which leads to no automaton being found.
    // In that case, we redirect the user.
    this.automaton$.pipe(untilDestroyed(this)).subscribe(automaton => {
      if (!automaton) {
        this.router.navigateByUrl('/automata');
      }
    });
    this.nodes$ = this.automaton$.pipe(map(automaton => this.getNodesForAutomaton(automaton)));
    this.links$ = this.automaton$.pipe(map(automaton => this.getLinksForAutomaton(automaton)));
    this.testCaseResults$ = this.automaton$.pipe(switchMap(automaton => this.automataService.performTestsForAutomaton(automaton)));
    this.transitionForm = this.formBuilder.group({
      state: ['', Validators.required],
      input: this.formBuilder.control('', [
        Validators.required,
        Validators.maxLength(1)
      ]),
      next_state: ['', Validators.required]
    });
    this.isTransitionFormValueRedundant$ = combineLatest([
      this.automaton$,
      this.transitionForm.valueChanges as Observable<Transition>
    ]).pipe(
      map(([automaton, transitionFromForm]) => {
        if (!automaton.transitions) {
          return false;
        }
        return automaton.transitions.some((transition: Transition) => {
          // The transition is redundant when the state and input is equal.
          // The next state does not matter here.
          // Example: If you already have a transition (q0, '1') => q2,
          // you cannot have a transition (q0, '1') => q3.
          return transition.state === transitionFromForm.state
            && transition.input === transitionFromForm.input;
        });
      }),
    );
    // We create an observable, that emits only when a test case has been added or removed.
    // Whenever that happens we want to recreate the test cases form. This is necessary because
    // we update the validator that checks that no duplicate test string are added.
    // Whenever a test case has been added, we additionally reset the field values.
    // This is because the user does not want the text field to contain the test string that he just added.
    // However, if this observable fires because a test case has been deleted, just the validators are updates
    // but the field values remain. This is because the user doesn't want his input to be lost whenever he deletes
    // a test case.
    this.automaton$.pipe(
      map(automaton => automaton.test_cases),
      startWith([] as TestCase[]),
      pairwise(),
      filter(([previous, current]) => {
        if (!previous || !current) {
          return true;
        }
        return previous?.length !== current?.length;
      }),
      untilDestroyed(this)
    ).subscribe(([previous, current]) => {
      const existingInputs = current ? current.map(testCase => testCase.test_input) : [];
      // If a test case has been added, we reset the input field values.
      // Otherwise we leave them unchanged. The form should also be set to default values when it is not defined yet.
      const hasTestCaseBeenAdded = previous?.length < current?.length;
      const shouldFormBeSetToDefaultValues = hasTestCaseBeenAdded || !this.testInputControl || !this.expectationControl;
      this.testCaseForm = this.formBuilder.group({
        test_input: this.formBuilder.control(!shouldFormBeSetToDefaultValues ? this.testInputControl.value : '',
          RxwebValidators.noneOf({matchValues: existingInputs})),
        expectation: this.formBuilder.control(!shouldFormBeSetToDefaultValues ? this.expectationControl.value : false)
      });
    });
    this.testCaseError$ = this.testCaseResults$.pipe(
      map(testCases => testCases.find(testCase => testCase.error)?.error)
    );
  }

  getNodesForAutomaton(automaton: Automaton): any[] {
    const transitions = automaton?.transitions ?? [];
    const states = transitions.map(transition => new Set([transition.state, transition.next_state]))
      .reduce((previousArray, currentArray) => new Set([...previousArray, ...currentArray]), new Set());
    return [...states].map(state => {
      return {
        id: state,
        label: state
      };
    });
  }

  getLinksForAutomaton(automaton: Automaton): any[] {
    const transitions = automaton?.transitions ?? [];
    const result = transitions.map((transition, index) => {
      return {
        id: `link-${index}`,
        source: transition.state,
        target: transition.next_state,
        label: transition.input
      };
    });
    // If the automaton has a start state, insert a link to it which indicates that it is the start state.
    // This link has no predecessor which is typical for the start state link.
    if (automaton.start_state) {
      result.push({
        id: this.START_LINK_ID,
        source: undefined,
        target: automaton.start_state,
        label: undefined
      });
    }
    return result;
  }

  addTransition(automaton: Automaton): void {
    const transition: Transition = this.transitionForm.value;
    this.automataService.addTransitionToAutomaton(automaton, transition);
    this.transitionForm.reset({
      state: '',
      input: '',
      next_state: ''
    });
  }

  removeCurrentSelection(automaton: Automaton): void {
    if (typeof this.currentSelection === 'string') {
      this.automataService.removeStateFromAutomaton(automaton, this.currentSelection);
    } else if (typeof this.currentSelection === 'number') {
      this.automataService.removeTransitionFromAutomaton(automaton, this.currentSelection);
    }
    delete this.currentSelection;
  }

  addTestCase(automaton: Automaton): void {
    const testCase: TestCase = this.testCaseForm.value;
    this.automataService.addTestCaseToAutomaton(automaton, testCase);
  }

  setCurrentSelectionAsStartState(automaton: Automaton): void {
    if (typeof this.currentSelection === 'string') {
      this.automataService.setStartState(automaton, this.currentSelection);
    }
  }

  isCurrentSelectionADenyingState(automaton: Automaton): boolean {
    return typeof this.currentSelection === 'string'
      && !automaton.accept_states?.includes(this.currentSelection);
  }

  addCurrentSelectionToAcceptingStates(automaton: Automaton): void {
    if (typeof this.currentSelection === 'string') {
      this.automataService.addAcceptState(automaton, this.currentSelection);
    }
  }

  isCurrentSelectionAnAcceptingState(automaton: Automaton): boolean {
    return typeof this.currentSelection === 'string'
      && automaton.accept_states?.includes(this.currentSelection);
  }

  /**
   * Converts an accepting state to a rejecting state just by removing the state from the list of accepting states.
   */
  removeCurrentSelectionFromAcceptingStates(automaton: Automaton): void {
    if (typeof this.currentSelection === 'string') {
      this.automataService.removeAcceptState(automaton, this.currentSelection);
    }
  }

  /**
   * Called when a test case is moved per drag and drop. The test case can either change position with
   * another test case or be deleted when the user drags it out of the test case section.
   */
  dropTestCase(automaton: Automaton, event: CdkDragDrop<TestCaseResult[]>): void {
    const isDroppedOutsideOfContainer = !event.isPointerOverContainer;
    if (isDroppedOutsideOfContainer) {
      this.automataService.removeTestCaseFromAutomaton(automaton, event.previousIndex);
      return;
    }
    this.automataService.changeTestCaseOrder(automaton, event.previousIndex, event.currentIndex);
  }

  /**
   * Removes unnecessary white spaces from the text field at the beginning and end of the string.
   * Furthermore replaces sequential whitespaces with just one whitespace. "a  a" becomes "a a".
   */
  trimTextFieldAndRemoveSequentialWhitespaces(control: AbstractControl): void {
    const value: string = control.value;
    const newValue = value.trim().replace(/\s+/g, ' ');
    control.setValue(newValue);
  }

  removeWhitespacesFromTextField(testInputControl: AbstractControl): void {
    const value: string = testInputControl.value;
    // Replace any whitespace characters.
    const newValue = value.replace(/\s/g, '');
    if (newValue.length < value.length) {
      testInputControl.setValue(newValue);
      this.snackBar.open('White Spaces as input for test cases are not allowed and automatically removed.', 'OK');
    }
  }

  async minimize(automaton: Automaton): Promise<void> {
    const minimization = await this.automataService.doMinimizationForAutomaton(automaton).pipe(first()).toPromise();
    this.dialog.open(MinimizationDialogComponent, {data: minimization});
  }

  /**
   * Opens a simulation that shows how is test case is executed on an automaton.
   */
  simulate(result: TestCaseResult): void {
    this.dialog.open(SimulationDialogComponent, {
      data: {
        automaton$: this.automaton$,
        result$: of(result)
      } as SimulationDialogData,
      height: '98%',
      width: '98%',
      maxHeight: '98%',
      maxWidth: '98%'
    });
  }

  /**
   * Determines the color of a test case result indicator depending on the test status.
   */
  getTestResultIndicatorStyle(result: TestCaseResult): string {
    if (result.testStatus === 'success') {
      return 'color: green';
    }
    if (result.testStatus === 'failure') {
      return 'color: red';
    }
    return '';
  }

  /**
   * Determines the icon of a test case result indicator depending on the test status.
   */
  getTestResultIndicatorIcon(result: TestCaseResult): string {
    if (result.testStatus === 'success') {
      return 'done';
    }
    if (result.testStatus === 'failure') {
      return 'close';
    }
    return 'help_outline';
  }

  canCurrentSelectionBeSetAsAcceptingState(automaton: Automaton): boolean {
    return typeof this.currentSelection === 'string' && this.currentSelection !== automaton.start_state;
  }
}
