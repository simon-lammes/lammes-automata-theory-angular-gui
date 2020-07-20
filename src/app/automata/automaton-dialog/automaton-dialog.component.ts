import {Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {AbstractControl, FormBuilder, FormGroup, Validators} from '@angular/forms';
import {AutomataService, Automaton} from '../automata.service';
import {RxwebValidators} from '@rxweb/reactive-form-validators';
import {UntilDestroy, untilDestroyed} from '@ngneat/until-destroy';

@UntilDestroy()
@Component({
  selector: 'app-automaton-dialog',
  templateUrl: './automaton-dialog.component.html',
  styleUrls: ['./automaton-dialog.component.scss']
})
export class AutomatonDialogComponent implements OnInit {
  automatonForm: FormGroup;

  constructor(
    private readonly dialogRef: MatDialogRef<AutomatonDialogComponent>,
    @Inject(MAT_DIALOG_DATA) private readonly data: any,
    private formBuilder: FormBuilder,
    private automataService: AutomataService
  ) {
  }

  get nameControl(): AbstractControl {
    return this.automatonForm.controls.name;
  }

  ngOnInit(): void {
    this.automataService.automata$.pipe(untilDestroyed(this)).subscribe(automata => {
      const automataNames = automata.map(automaton => automaton.name);
      this.automatonForm = this.formBuilder.group({
        name: this.formBuilder.control('', [
          Validators.required,
          RxwebValidators.noneOf({matchValues: automataNames})
        ]),
      });
    });
  }

  cancel(): any {
    this.dialogRef.close();
  }

  save(): void {
    const automaton: Automaton = {
      name: this.nameControl.value
    };
    this.automataService.saveAutomaton(automaton);
    this.dialogRef.close();
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
}
