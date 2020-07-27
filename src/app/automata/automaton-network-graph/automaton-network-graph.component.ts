import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {Observable} from 'rxjs';
import {Automaton} from '../automata.service';
import {map} from 'rxjs/operators';

@Component({
  selector: 'app-automaton-network-graph',
  templateUrl: './automaton-network-graph.component.html',
  styleUrls: ['./automaton-network-graph.component.scss']
})
export class AutomatonNetworkGraphComponent implements OnInit {
  /**
   * The id of the link that comes "out of nowhere" to the start state, indicating where the start state is.
   */
  readonly START_LINK_ID = 'start';
  @Input() width = 700;
  @Input() height = 500;
  /**
   * Intended to be only passed in on creation and not to be changed afterwards.
   * Observables in general are not intended to be changed.
   */
  @Input() automaton$: Observable<Automaton>;
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
  @Input() selection: number | string;
  /**
   * Whether the user can select nodes or links in the graph.
   */
  @Input() isSelectionEnabled = true;
  @Output() selectionChange = new EventEmitter<number | string>();
  /**
   * The states of the automaton.
   */
  states$: Observable<Set<string>>;
  /**
   * Nodes in the network graph.
   */
  nodes$: Observable<any[]>;
  /**
   * Links in the network graph.
   */
  links$: Observable<any[]>;

  /**
   * The link id is somethink like 'link-6' and this method extracts the 6.
   */
  private static getTransitionIndexFromLinkId(linkId: string): number {
    return +linkId.substr(5);
  }

  /**
   * The library ngx-graph does not properly work with link ids which can be transformed to a number.
   * Therefore we cannot set the link id to a string like '6'. Instead we prepend some string like 'link-' to
   * make it 'link-6'.
   */
  private static getLinkIdForTransitionIndex(transitionIndex: number): string {
    return `link-${transitionIndex}`;
  }

  ngOnInit(): void {
    this.states$ = this.automaton$.pipe(
      map(automaton => {
        const transitions = automaton?.transitions ?? [];
        return transitions.map(transition => new Set([transition.state, transition.next_state]))
          .reduce((previousArray, currentArray) => new Set([...previousArray, ...currentArray]), new Set());
      })
    );
    this.nodes$ = this.states$.pipe(map(states => this.getNodesForStates(states)));
    this.links$ = this.automaton$.pipe(map(automaton => this.getLinksForAutomaton(automaton)));
  }

  /**
   * Creates the nodes for the network graph. There is a node for every state of the automaton.
   * @param states the states of the automaton
   */
  getNodesForStates(states: Set<string>): any[] {
    return [...states].map(state => {
      return {
        id: state,
        label: state
      };
    });
  }

  /**
   * Creates the links for the network graph. There is a node for every transition of the automaton.
   */
  getLinksForAutomaton(automaton: Automaton): any[] {
    const transitions = automaton?.transitions ?? [];
    const result = transitions.map((transition, index) => {
      return {
        id: AutomatonNetworkGraphComponent.getLinkIdForTransitionIndex(index),
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

  async onNodeClicked(nodeId: string): Promise<void> {
    if (!this.isSelectionEnabled) {
      return;
    }
    this.selectionChange.emit(nodeId);
  }

  isNodeCurrentlySelected(node: any): boolean {
    return typeof this.selection === 'string' && this.selection === node.id;
  }

  async onLinkClicked(linkId: string): Promise<void> {
    if (!this.isSelectionEnabled) {
      return;
    }
    // The link indicating the start state is static and cannot be modified.
    // Therefore it is not clickable.
    if (linkId === this.START_LINK_ID) {
      return;
    }
    const transitionIndex = AutomatonNetworkGraphComponent.getTransitionIndexFromLinkId(linkId);
    this.selection = transitionIndex;
    this.selectionChange.emit(this.selection);
  }

  isLinkCurrentlySelected(link: any): boolean {
    return typeof this.selection === 'number' && AutomatonNetworkGraphComponent.getLinkIdForTransitionIndex(this.selection) === link.id;
  }
}
