import {Component, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {AutomataService, Automaton, Transition} from '../automata.service';
import {UntilDestroy} from '@ngneat/until-destroy';
import {map, switchMap} from 'rxjs/operators';
import {AbstractControl, FormBuilder, FormGroup, Validators} from '@angular/forms';
import {Observable} from 'rxjs';

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
  automaton$: Observable<Automaton>;
  nodes$: Observable<any[]>;
  links$: Observable<any[]>;
  transitionForm: FormGroup;
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
    this.transitionForm = this.formBuilder.group({
      state: ['', Validators.required],
      input: this.formBuilder.control('', [Validators.required, Validators.maxLength(1)]),
      next_state: ['', Validators.required]
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
    return result;
  }

  onNodeClicked(nodeId: string): void {
    this.currentSelection = {
      selectedId: nodeId,
      selectedType: 'node'
    };
  }

  onLinkClicked(linkId: string): void {
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
    const transition: Transition = {
      state: this.stateControl.value,
      input: this.inputControl.value,
      next_state: this.nextStateControl.value
    };
    this.automataService.addTransitionToAutomaton(automaton, transition);
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
}
