import {Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {AbstractControl, FormBuilder, FormControl, FormGroup, Validators} from '@angular/forms';
import {AutomataService, Automaton} from '../automata.service';

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
    this.automatonForm = this.formBuilder.group({
      name: ['', Validators.required],
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
}
