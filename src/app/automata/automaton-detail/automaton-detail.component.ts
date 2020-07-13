import {Component, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {AutomataService, Automaton, TestCase, TestCaseResult, Transition} from '../automata.service';
import {UntilDestroy} from '@ngneat/until-destroy';
import {map, switchMap} from 'rxjs/operators';
import {AbstractControl, FormBuilder, FormGroup, Validators} from '@angular/forms';
import {Observable} from 'rxjs';
import {CdkDragDrop} from '@angular/cdk/drag-drop';

interface GraphSelection {
  selectedType: 'node' | 'link';
  selectedId: any;
}

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
  nodes$: Observable<any[]>;
  links$: Observable<any[]>;
  testCaseResults$: Observable<TestCaseResult[]>;
  transitionForm: FormGroup;
  testCaseForm: FormGroup;
  currentSelection: GraphSelection;

  constructor(
    private activatedRoute: ActivatedRoute,
    private automataService: AutomataService,
    private formBuilder: FormBuilder
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

  ngOnInit(): void {
    this.automaton$ = this.activatedRoute.paramMap.pipe(
      switchMap(paramMap => this.automataService.getAutomatonByName(paramMap.get('automatonName')))
    );
    this.nodes$ = this.automaton$.pipe(map(automaton => this.getNodesForAutomaton(automaton)));
    this.links$ = this.automaton$.pipe(map(automaton => this.getLinksForAutomaton(automaton)));
    this.testCaseResults$ = this.automaton$.pipe(switchMap(automaton => this.automataService.performTestsForAutomaton(automaton)));
    this.transitionForm = this.formBuilder.group({
      state: ['', Validators.required],
      input: this.formBuilder.control('', [Validators.required, Validators.maxLength(1)]),
      next_state: ['', Validators.required]
    });
    this.testCaseForm = this.formBuilder.group({
      test_input: this.formBuilder.control(''),
      expectation: this.formBuilder.control(false)
    });
  }

  getNodesForAutomaton(automaton: Automaton): any[] {
    const transitions = automaton?.transitions ?? [];
    const states = transitions.map(transition => new Set([transition.state, transition.next_state]))
      .reduce((previousArray, currentArray) => new Set([...previousArray, ...currentArray]), new Set());
    const result = [...states].map(state => {
      return {
        id: state,
        label: state
      };
    });
    return result;
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

  onNodeClicked(nodeId: string): void {
    this.currentSelection = {
      selectedId: nodeId,
      selectedType: 'node'
    };
  }

  onLinkClicked(linkId: string): void {
    // The link indicating the start state is static and cannot be modified.
    // Therefore it is not clickable.
    if (linkId === this.START_LINK_ID) {
      return;
    }
    this.currentSelection = {
      selectedId: linkId,
      selectedType: 'link'
    };
  }

  isNodeCurrentlySelected(node: any): boolean {
    return this.currentSelection?.selectedType === 'node' && this.currentSelection.selectedId === node.id;
  }

  isLinkCurrentlySelected(link: any): boolean {
    return this.currentSelection?.selectedType === 'link' && this.currentSelection.selectedId === link.id;
  }

  async addTransition(automaton: Automaton): Promise<void> {
    const transition: Transition = this.transitionForm.value;
    this.automataService.addTransitionToAutomaton(automaton, transition);
    this.transitionForm.reset({
      state: '',
      input: '',
      next_state: ''
    });
  }

  removeSelection(automaton: Automaton, removedSelection: GraphSelection): void {
    if (removedSelection.selectedType === 'node') {
      this.automataService.removeStateFromAutomaton(automaton, removedSelection.selectedId);
    } else if (removedSelection.selectedType === 'link') {
      // The selectedId is something like 'link-666'. We extract the number to get the transition index.
      const transitionIndex = parseInt((removedSelection.selectedId as string).slice(5), 10);
      this.automataService.removeTransitionFromAutomaton(automaton, transitionIndex);
    }
    delete this.currentSelection;
  }

  addTestCase(automaton: Automaton): void {
    const testCase: TestCase = this.testCaseForm.value;
    this.automataService.addTestCaseToAutomaton(automaton, testCase);
    this.testCaseForm.reset({
      test_input: '',
      expectation: false
    });
  }

  setStartState(automaton: Automaton, newStartState: string): void {
    this.automataService.setStartState(automaton, newStartState);
  }

  isCurrentSelectionADenyingState(automaton: Automaton): boolean {
    return this.currentSelection?.selectedType === 'node'
      && !automaton.accept_states?.includes(this.currentSelection.selectedId);
  }

  addAcceptState(automaton: Automaton, newAcceptState: string): void {
    this.automataService.addAcceptState(automaton, newAcceptState);
  }

  isCurrentSelectionAnAcceptingState(automaton: Automaton): boolean {
    return this.currentSelection?.selectedType === 'node'
      && automaton.accept_states?.includes(this.currentSelection.selectedId);
  }

  /**
   * Converts an accepting state to a rejecting state just by removing the state from the list of accepting states.
   * @param previouslyAcceptingState The state that is currently accepting but should and will be rejecting.
   */
  removeAcceptState(automaton: Automaton, previouslyAcceptingState: string): void {
    this.automataService.removeAcceptState(automaton, previouslyAcceptingState);
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
}
